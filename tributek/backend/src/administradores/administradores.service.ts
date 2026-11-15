import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
import type { Varchar } from '@prisma/orm-postgres/target/codec-types'
import 'temporal-polyfill/global'
import { PrismaService } from '../prisma/prisma.service.js'
import { AdminEmailVerificationService } from './admin-email-verification.service.js'

type CreateAdmin = { nombre: string, nombreUsuario: string, email: string, password: string, confirmarPassword: string }

@Injectable()
export class AdministradoresService {
  private readonly emailAttempts = new Map<string, { count: number, resetAt: number }>()
  constructor(private readonly prisma: PrismaService, @Optional() private readonly correo?: AdminEmailVerificationService) {}

  /** Se comprueba la cuenta real en cada solicitud, sin confiar en el nombre o rol del navegador. */
  async puedeAdministrar(actorId: string): Promise<boolean> {
    const configured = process.env['ADMIN_MANAGER_USER_ID']
    if (!configured || !/^[1-9]\d*$/.test(configured) || actorId !== configured) return false
    const actor = await this.prisma.db.orm.public.Usuario.where({ id: BigInt(actorId) }).first()
    if (!actor?.activo) return false
    const role = await this.prisma.db.orm.public.Rol.where({ id: actor.rolId }).first()
    return ['ADMIN', 'ADMINISTRADOR'].includes(String(role?.nombre ?? '').toUpperCase())
  }

  async autorizar(actorId: string) {
    if (!(await this.puedeAdministrar(actorId))) throw new ForbiddenException('Solo Constanza puede gestionar administradores.')
  }

  async listar(actorId: string) {
    await this.autorizar(actorId)
    const roles = await this.prisma.db.orm.public.Rol.all()
    const ids = roles.filter(r => ['ADMIN', 'ADMINISTRADOR'].includes(String(r.nombre).toUpperCase())).map(r => r.id)
    if (!ids.length) return []
    const users = await this.prisma.db.orm.public.Usuario.select('id', 'nombre', 'nombreUsuario', 'email', 'activo', 'creadoEn', 'emailVerificadoEn').where(u => u.rolId.in(ids)).orderBy(u => u.id.asc()).all()
    return users.map(u => ({ ...u, id: String(u.id), creadoEn: u.creadoEn?.toString() ?? null, esPrincipal: String(u.id) === process.env['ADMIN_MANAGER_USER_ID'] }))
  }

  async crear(actorId: string, input: unknown) {
    await this.autorizar(actorId)
    const data = this.validar(input)
    const roles = await this.prisma.db.orm.public.Rol.all()
    const role = roles.find(r => ['ADMIN', 'ADMINISTRADOR'].includes(String(r.nombre).toUpperCase()))
    if (!role) throw new BadRequestException('No existe un rol administrativo configurado.')
    const hash = await argon2.hash(data.password, { type: argon2.argon2id })
    try {
      return await this.prisma.db.transaction(async tx => {
        const username = data.nombreUsuario.replace(/[\\%_]/g, '\\$&')
        const email = data.email.replace(/[\\%_]/g, '\\$&')
        const existingUser = await tx.orm.public.Usuario.where(u => u.nombreUsuario.ilike(username)).first()
        if (existingUser) throw new ConflictException('Ese nombre de usuario ya está registrado.')
        const existingEmail = await tx.orm.public.Usuario.where(u => u.email.ilike(email)).first()
        if (existingEmail) throw new ConflictException('Ese correo ya está registrado.')
        const user = await tx.orm.public.Usuario.create({
          rolId: role.id, nombre: data.nombre as Varchar<120>, nombreUsuario: data.nombreUsuario as Varchar<80>,
          email: data.email as Varchar<150>, passwordHash: hash as Varchar<255>, activo: true,
          creadoEn: Temporal.Now.instant(), actualizadoEn: Temporal.Now.instant(),
        })
        await tx.orm.public.Auditoria.create({
          usuarioId: BigInt(actorId), accion: 'CREAR' as Varchar<80>, entidad: 'Administrador' as Varchar<80>, entidadId: user.id,
          detalle: 'Creación de cuenta administrativa. No se concedió permiso para crear administradores.' as Varchar<1000>, creadoEn: Temporal.Now.instant(),
        })
        return { id: String(user.id), nombre: user.nombre, nombreUsuario: user.nombreUsuario, email: user.email, activo: user.activo }
      })
    } catch (error) {
      let cause: unknown = error
      for (let depth = 0; depth < 5 && cause && typeof cause === 'object'; depth++) {
        if ('code' in cause && cause.code === '23505') throw new ConflictException('El nombre de usuario o correo ya está registrado.')
        cause = 'cause' in cause ? cause.cause : null
      }
      throw error
    }
  }

  async solicitarCambioCorreo(actorId: string, targetId: string, input: unknown) {
    const { email } = await this.validarCambioCorreo(actorId, targetId, input, false)
    const target = await this.prisma.db.orm.public.Usuario.where({ id: BigInt(targetId) }).first()
    if (!target) throw new NotFoundException('No se encontró el administrador.')
    const role = await this.prisma.db.orm.public.Rol.where({ id: target.rolId }).first()
    if (!['ADMIN', 'ADMINISTRADOR'].includes(String(role?.nombre ?? '').toUpperCase())) throw new BadRequestException('Esta cuenta no es administrativa.')
    if (target.email === email && target.emailVerificadoEn) throw new BadRequestException('Ese correo ya está registrado en esta cuenta.')
    const duplicate = await this.prisma.db.orm.public.Usuario.where(u => u.email.ilike(email.replace(/[\\%_]/g, '\\$&'))).first()
    if (duplicate && duplicate.id !== target.id) throw new ConflictException('Ese correo ya está registrado en otra cuenta.')
    if (!this.correo) throw new BadRequestException('El envío de correo no está configurado.')
    return this.correo.enviar(`${actorId}:${targetId}`, email)
  }

  /** El correo de la cuenta solo se modifica después de confirmar su código y la contraseña de la responsable. */
  async actualizarCorreo(actorId: string, targetId: string, input: unknown) {
    const { email, code } = await this.validarCambioCorreo(actorId, targetId, input, true)
    if (!this.correo) throw new BadRequestException('El envío de correo no está configurado.')
    this.correo.consumir(`${actorId}:${targetId}`, email, code)
    try {
      return await this.prisma.db.transaction(async tx => {
        const target = await tx.orm.public.Usuario.where({ id: BigInt(targetId) }).first()
        if (!target) throw new NotFoundException('No se encontró el administrador.')
        const role = await tx.orm.public.Rol.where({ id: target.rolId }).first()
        if (!['ADMIN', 'ADMINISTRADOR'].includes(String(role?.nombre ?? '').toUpperCase())) throw new BadRequestException('Esta cuenta no es administrativa.')
        const pattern = email.replace(/[\\%_]/g, '\\$&')
        const duplicate = await tx.orm.public.Usuario.where(u => u.email.ilike(pattern)).first()
        if (duplicate && duplicate.id !== target.id) throw new ConflictException('Ese correo ya está registrado en otra cuenta.')
        if (target.email === email && target.emailVerificadoEn) return { id: String(target.id), email, actualizado: false }
        const user = await tx.orm.public.Usuario.where({ id: target.id }).update({ email: email as Varchar<150>, emailVerificadoEn: Temporal.Now.instant(), actualizadoEn: Temporal.Now.instant() })
        if (!user) throw new NotFoundException('No se encontró el administrador.')
        await tx.orm.public.Auditoria.create({
          usuarioId: BigInt(actorId), accion: 'ACTUALIZAR' as Varchar<80>, entidad: 'Administrador' as Varchar<80>, entidadId: target.id,
          detalle: 'Correo administrativo actualizado tras confirmar la contraseña de la responsable.' as Varchar<1000>, creadoEn: Temporal.Now.instant(),
        })
        return { id: String(user.id), email: user.email, actualizado: true }
      })
    } catch (error) {
      let cause: unknown = error
      for (let depth = 0; depth < 5 && cause && typeof cause === 'object'; depth++) {
        if ('code' in cause && cause.code === '23505') throw new ConflictException('Ese correo ya está registrado en otra cuenta.')
        cause = 'cause' in cause ? cause.cause : null
      }
      throw error
    }
  }


  private async validarCambioCorreo(actorId: string, targetId: string, input: unknown, requireCode: boolean) {
    await this.autorizar(actorId)
    if (!/^[1-9]\d*$/.test(targetId)) throw new BadRequestException('Administrador inválido.')
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Formulario inválido.')
    const data = input as Record<string, unknown>
    if (Object.keys(data).some(key => !['email', 'password', 'code'].includes(key)) || typeof data.email !== 'string' || typeof data.password !== 'string') throw new BadRequestException('Ingresa el correo y tu contraseña actual.')
    if (requireCode && (typeof data.code !== 'string' || !/^\d{6}$/.test(data.code))) throw new BadRequestException('Ingresa los 6 dígitos enviados al nuevo correo.')
    const email = data.email.trim().toLowerCase()
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Ingresa un correo válido de hasta 150 caracteres.')
    if (!data.password || data.password.length > 128) throw new BadRequestException('Ingresa tu contraseña actual.')
    const attempts = this.emailAttempts.get(actorId)
    if (attempts && Date.now() < attempts.resetAt && attempts.count >= 5) throw new ForbiddenException('Demasiados intentos de contraseña. Espera 15 minutos antes de volver a intentarlo.')
    const actor = await this.prisma.db.orm.public.Usuario.where({ id: BigInt(actorId) }).first()
    if (!actor?.activo || !(await argon2.verify(actor.passwordHash, data.password))) {
      const current = attempts && Date.now() < attempts.resetAt ? attempts : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 }
      this.emailAttempts.set(actorId, { ...current, count: current.count + 1 })
      throw new UnauthorizedException('Tu contraseña actual no es correcta.')
    }
    this.emailAttempts.delete(actorId)
    return { email, code: typeof data.code === 'string' ? data.code : '' }
  }

  private validar(input: unknown): CreateAdmin {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Formulario inválido.')
    const source = input as Record<string, unknown>
    const fields = ['nombre', 'nombreUsuario', 'email', 'password', 'confirmarPassword']
    if (Object.keys(source).some(key => !fields.includes(key)) || fields.some(key => typeof source[key] !== 'string')) throw new BadRequestException('Completa los campos del formulario. No se permiten permisos o roles personalizados.')
    const data = source as CreateAdmin
    const nombre = data.nombre.trim()
    const nombreUsuario = data.nombreUsuario.trim()
    const email = data.email.trim().toLowerCase()
    if (nombre.length < 2 || nombre.length > 120) throw new BadRequestException('El nombre debe tener entre 2 y 120 caracteres.')
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/.test(nombreUsuario)) throw new BadRequestException('El usuario debe tener entre 3 y 80 caracteres. Usa letras, números, punto, guion o guion bajo.')
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Ingresa un correo válido de hasta 150 caracteres.')
    if (data.password.length < 12 || data.password.length > 128 || !data.password.trim()) throw new BadRequestException('La contraseña debe tener entre 12 y 128 caracteres.')
    if (data.password !== data.confirmarPassword) throw new BadRequestException('Las contraseñas no coinciden.')
    return { ...data, nombre, nombreUsuario, email }
  }
}
