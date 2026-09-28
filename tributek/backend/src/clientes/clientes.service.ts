import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { randomBytes } from 'node:crypto';
import 'temporal-polyfill/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async crearCliente(datos: CreateClienteDto) {
    const cliente = await this.prisma.db.orm.public.Cliente.create({
      ...this.clienteData(datos),
      creadoEn: Temporal.Now.instant(),
    });
    if (!datos.accesoPortal?.invitar) return cliente;
    const usuario = await this.crearCuentaInvitada(
      cliente.id,
      datos.contactoPrincipal?.trim() || datos.nombreRazonSocial,
    );
    return {
      ...cliente,
      accesoPortal: { activationUrl: await this.generarEnlaceActivacion(usuario.id) },
    };
  }

  async actualizarCliente(id: string, datos: CreateClienteDto) {
    const clienteId = BigInt(id);
    let vinculoPortal: any;
    let usuarioPortal: any;
    if (datos.accesoPortal) {
      const vinculos = await this.prisma.db.orm.public.UsuarioCliente
        .where({ clienteId })
        .all();
      vinculoPortal = vinculos.find((item: any) => item.esPrincipal) ?? vinculos[0];
      if (vinculoPortal) {
        usuarioPortal = await this.prisma.db.orm.public.Usuario
          .where({ id: vinculoPortal.usuarioId })
          .first();
      }
    }
    const nombreUsuario = datos.accesoPortal?.nombreUsuario !== undefined
      ? await this.validarNombreUsuario(datos.accesoPortal.nombreUsuario, usuarioPortal?.id)
      : undefined;
    const emailUsuario = datos.accesoPortal?.email !== undefined
      ? await this.validarEmailUsuario(datos.accesoPortal.email, usuarioPortal?.id)
      : undefined;
    const cliente = await this.prisma.db.orm.public.Cliente.where({ id: clienteId }).update(
      this.clienteData(datos),
    );

    if (datos.accesoPortal?.revocar && vinculoPortal) {
      await this.prisma.db.orm.public.UsuarioCliente
        .where({ usuarioId: vinculoPortal.usuarioId, clienteId })
        .delete();
      const otrosVinculos = await this.prisma.db.orm.public.UsuarioCliente
        .where({ usuarioId: vinculoPortal.usuarioId })
        .all();
      if (!otrosVinculos.length && usuarioPortal) {
        await this.prisma.db.orm.public.Usuario.where({ id: usuarioPortal.id }).update({ activo: false });
      }
      return cliente;
    }

    if (usuarioPortal && (nombreUsuario || emailUsuario)) {
      await this.prisma.db.orm.public.Usuario.where({ id: usuarioPortal.id }).update({
        ...(nombreUsuario ? { nombreUsuario: nombreUsuario as Varchar<80> } : {}),
        ...(emailUsuario ? { email: emailUsuario as Varchar<150> } : {}),
      });
    }

    if (datos.accesoPortal?.invitar && !usuarioPortal) {
      const usuario = await this.crearCuentaInvitada(
        clienteId,
        datos.contactoPrincipal?.trim() || datos.nombreRazonSocial,
      );
      return {
        ...cliente,
        accesoPortal: { activationUrl: await this.generarEnlaceActivacion(usuario.id) },
      };
    }
    if (datos.accesoPortal?.invitar && usuarioPortal && !usuarioPortal.activo) {
      return {
        ...cliente,
        accesoPortal: { activationUrl: await this.generarEnlaceActivacion(usuarioPortal.id) },
      };
    }
    return cliente;
  }

  async obtenerAccesoPortal(id: string) {
    const usuario = await this.buscarUsuarioPortal(id);
    if (!usuario) return { tieneAcceso: false };
    return {
      tieneAcceso: true,
      nombre: usuario.nombre,
      nombreUsuario: usuario.activo ? usuario.nombreUsuario : undefined,
      email: usuario.email,
      activo: usuario.activo,
      activationUrl: usuario.activo ? undefined : await this.generarEnlaceActivacion(usuario.id),
    };
  }

  async generarNuevoEnlaceInvitacion(id: string) {
    const usuario = await this.buscarUsuarioPortal(id);
    if (!usuario || usuario.activo) {
      throw new BadRequestException('No hay una invitación pendiente para este cliente.');
    }
    return { activationUrl: await this.generarEnlaceActivacion(usuario.id) };
  }

  async generarEnlaceRestablecimiento(id: string) {
    const usuario = await this.buscarUsuarioPortal(id);
    if (!usuario || !usuario.activo) {
      throw new BadRequestException('El portal no tiene una cuenta activa para restablecer.');
    }
    const token = await this.jwtService.signAsync(
      { sub: usuario.id.toString(), purpose: 'reset-client-password' },
      { expiresIn: '24h' },
    );
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    return { resetUrl: `${frontendUrl}/activar-cuenta?modo=restablecer&token=${encodeURIComponent(token)}` };
  }

  private async buscarUsuarioPortal(id: string) {
    const clienteId = BigInt(id);
    const vinculos = await this.prisma.db.orm.public.UsuarioCliente
      .where({ clienteId })
      .all();
    const vinculo = vinculos.find((item: any) => item.esPrincipal) ?? vinculos[0];
    if (!vinculo) return null;

    return this.prisma.db.orm.public.Usuario
      .where({ id: vinculo.usuarioId })
      .first();
  }

  async obtenerMisClientes(usuarioId: string) {
    const usuario = await this.prisma.db.orm.public.Usuario
      .where({ id: BigInt(usuarioId) })
      .first();
    const rolCliente = await this.prisma.db.orm.public.Rol
      .where({ nombre: 'CLIENTE' as Varchar<30> })
      .first();
    if (!usuario || !usuario.activo || !rolCliente || usuario.rolId !== rolCliente.id) {
      throw new ForbiddenException('Esta cuenta no tiene acceso activo al portal de clientes.');
    }

    const vinculos = await this.prisma.db.orm.public.UsuarioCliente
      .where({ usuarioId: usuario.id })
      .all();
    const clientes = [];
    for (const vinculo of vinculos) {
      const cliente = await this.prisma.db.orm.public.Cliente
        .where({ id: vinculo.clienteId })
        .first();
      if (cliente) clientes.push({ ...cliente, id: cliente.id.toString() });
    }
    return { nombre: usuario.nombre, clientes };
  }

  private async validarNombreUsuario(nombre?: string, usuarioId?: bigint) {
    const identificador = nombre?.trim();
    const nombreUsuario = identificador?.includes('@')
      ? identificador.toLowerCase()
      : identificador;
    if (!nombreUsuario) throw new BadRequestException('Ingresa un nombre de usuario para el portal.');
    if (nombreUsuario.length > 80) throw new BadRequestException('El nombre de usuario no puede superar los 80 caracteres.');

    const usuarioExistente = await this.prisma.db.orm.public.Usuario
      .where({ nombreUsuario: nombreUsuario as Varchar<80> })
      .first();
    if (usuarioExistente && usuarioExistente.id !== usuarioId) {
      throw new BadRequestException('Ese nombre de usuario ya est? en uso.');
    }
    return nombreUsuario;
  }

  private async validarEmailUsuario(email?: string, usuarioId?: bigint) {
    const correo = email?.trim().toLowerCase();
    if (!correo || correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new BadRequestException('Ingresa un correo electrónico válido de hasta 150 caracteres.');
    }
    const usuarioExistente = await this.prisma.db.orm.public.Usuario
      .where({ email: correo as Varchar<150> })
      .first();
    if (usuarioExistente && usuarioExistente.id !== usuarioId) {
      throw new BadRequestException('Ese correo electrónico ya está asociado a otra cuenta.');
    }
    return correo;
  }

  private async crearCuentaInvitada(clienteId: bigint, nombre: string) {
    const rol = await this.prisma.db.orm.public.Rol
      .where({ nombre: 'CLIENTE' as Varchar<30> })
      .first();
    if (!rol) throw new BadRequestException('No est? configurado el rol CLIENTE.');

    const usuario = await this.prisma.db.orm.public.Usuario.create({
      rolId: rol.id,
      nombre: nombre.slice(0, 120) as Varchar<120>,
      email: null,
      nombreUsuario: `invitacion_${randomBytes(16).toString('hex')}` as Varchar<80>,
      passwordHash: (await argon2.hash(randomBytes(32).toString('hex'))) as Varchar<255>,
      activo: false,
      creadoEn: Temporal.Now.instant(),
    });
    await this.prisma.db.orm.public.UsuarioCliente.create({
      usuarioId: usuario.id,
      clienteId,
      esPrincipal: true,
    });
    return usuario;
  }

  private async generarEnlaceActivacion(usuarioId: bigint) {
    const token = await this.jwtService.signAsync(
      { sub: usuarioId.toString(), purpose: 'set-client-password' },
      { expiresIn: '24h' },
    );
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    return `${frontendUrl}/activar-cuenta?token=${encodeURIComponent(token)}`;
  }

  private clienteData(datos: CreateClienteDto) {
    return {
      tipoCliente: datos.tipoCliente,
      rut: datos.rut,
      nombreRazonSocial: datos.nombreRazonSocial,
      contactoPrincipal: datos.contactoPrincipal,
      emailContacto: datos.emailContacto,
      telefono: datos.telefono,
      direccion: datos.direccion,
      estado: datos.estado,
    } as any;
  }

  async obtenerClientes(buscar?: string) {
    const textoBusqueda = buscar?.trim();
    const baseQuery = this.prisma.db.orm.public.Cliente.orderBy((cliente) =>
      cliente.id.desc(),
    );

    if (!textoBusqueda) return baseQuery.all();

    const porNombre = await baseQuery
      .where((cliente) => cliente.nombreRazonSocial.ilike(`%${textoBusqueda}%`))
      .all();
    const porRut = await baseQuery
      .where((cliente) => cliente.rut.ilike(`%${textoBusqueda}%`))
      .all();
    const clientesUnicos = new Map<string, any>();
    for (const cliente of [...porNombre, ...porRut]) {
      clientesUnicos.set(String(cliente.id), cliente);
    }
    return [...clientesUnicos.values()].sort((a, b) => Number(b.id) - Number(a.id));
  }

  async obtenerCliente(id: string) {
    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: BigInt(id) })
      .first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    return cliente;
  }
}
