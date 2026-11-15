import { BadRequestException, Injectable, Optional, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as argon2 from 'argon2';
import 'temporal-polyfill/global';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { JwtService } from '@nestjs/jwt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { encryptSecret, readSecret } from './two-factor-crypto.js';
import { EmailVerificationService } from '../correo/email-verification.service.js'
import { randomBytes } from 'crypto';
import { credentialVersion } from './credential-version.js'

let dummyPasswordHash: Promise<string> | undefined

type ChallengePayload = { sub?: string; purpose?: string; jti?: string };
const SETUP_TTL_MS = 10 * 60 * 1000; // 10 min

@Injectable()
export class AuthService {
  // In-memory protections (single-instance/dev). For multi-instance, persist in DB/Redis.
  private readonly loginChallenges = new Map<string, { sub: string; exp: number; email?: string | null; credentialVersion: string }>()
  private readonly usedTotpSteps = new Map<string, number>(); // userId -> last accepted step
  private readonly verifyAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Optional() private readonly correo?: EmailVerificationService,
  ) {}

  private challengeSecret(): string {
    const secret = process.env['JWT_2FA_SECRET'];
    if (!secret) {
      throw new Error('JWT_2FA_SECRET must be configured.');
    }
    return secret;
  }

  private normalizeRecoveryCode(code: string): string {
    return code.trim().toLowerCase().replace(/[\s-]/g, '');
  }

  private isRecoveryCodeFormat(code: string): boolean {
    return /^[a-f0-9]{8,16}$/i.test(this.normalizeRecoveryCode(code));
  }

  private async hashRecoveryCode(code: string): Promise<string> {
    return argon2.hash(this.normalizeRecoveryCode(code));
  }

  private async verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, this.normalizeRecoveryCode(code));
    } catch {
      return false;
    }
  }

  private parseRecoveryHashes(stored: unknown): string[] {
    if (typeof stored !== 'string' || !stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === 'string') : [];
    } catch {
      return [];
    }
  }

  private serializeRecoveryHashes(hashes: string[]): string | null {
    return hashes.length ? JSON.stringify(hashes) : null;
  }

  private setupExpired(expiresAt: unknown): boolean {
    if (!expiresAt) return true;
    try {
      const t = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(String(expiresAt));
      return !Number.isFinite(t) || t < Date.now();
    } catch {
      return true;
    }
  }

  private checkRateLimit(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const cur = this.verifyAttempts.get(key);
    if (!cur || now > cur.resetAt) {
      this.verifyAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    cur.count += 1;
    if (cur.count > max) {
      throw new UnauthorizedException('Demasiados intentos. Intenta nuevamente más tarde.');
    }
  }

  private clearRateLimit(key: string) {
    this.verifyAttempts.delete(key);
  }

  private async getUsuarioById(id: string | number | bigint) {
    return this.prisma.db.orm.public.Usuario.where({ id: BigInt(id) }).first();
  }

  private async issueAccessToken(usuario: any, rolNombre: string) {
    const payload = {
      sub: usuario.id.toString(),
      nombreUsuario: usuario.nombreUsuario,
      rolId: usuario.rolId.toString(),
      rolNombre,
      purpose: 'access',
      credentialVersion: credentialVersion(usuario.passwordHash),
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      mensaje: 'Inicio de sesión exitoso',
      access_token: accessToken,
      usuario: {
        id: usuario.id.toString(),
        nombreUsuario: usuario.nombreUsuario,
        rolId: usuario.rolId.toString(),
        rolNombre,
      },
    };
  }

  /** Verifica el token temporal y su propósito, valida los datos y guarda la contraseña mediante hash al activar o restablecer la cuenta. */
  async activarCuenta(
    token: string,
    nombreUsuario: string | undefined,
    email: string | undefined,
    password: string,
    confirmarPassword: string,
  ) {
    let payload: { sub?: string; purpose?: string; credentialVersion?: string }
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('El enlace es inválido o expiró.');
    }

    const esInvitacion = payload.purpose === 'set-client-password';
    const esRestablecimiento = payload.purpose === 'reset-client-password';
    if ((!esInvitacion && !esRestablecimiento) || !payload.sub) {
      throw new UnauthorizedException('El enlace no es válido.');
    }
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      throw new BadRequestException('La contraseña debe tener al menos 10 caracteres.');
    }
    if (password !== confirmarPassword) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }

    const identificador = nombreUsuario?.trim();
    const usuarioNombre = identificador?.includes('@')
      ? identificador.toLowerCase()
      : identificador;
    if (esInvitacion && (!usuarioNombre || usuarioNombre.length > 80)) {
      throw new BadRequestException(
        'Ingresa un nombre de usuario válido de hasta 80 caracteres.',
      );
    }

    const correo = email?.trim().toLowerCase();
    if (
      esInvitacion &&
      (!correo || correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    ) {
      throw new BadRequestException(
        'Ingresa un correo electrónico válido de hasta 150 caracteres.',
      );
    }

    const usuario = await this.prisma.db.orm.public.Usuario.where({
      id: BigInt(payload.sub),
    }).first();
    if (
      !usuario ||
      (esInvitacion && usuario.activo) ||
      (esRestablecimiento && !usuario.activo)
    ) {
      throw new UnauthorizedException('La cuenta no existe o el enlace ya no es válido.');
    }
    if (esRestablecimiento && payload.credentialVersion !== credentialVersion(usuario.passwordHash)) {
      throw new UnauthorizedException('El enlace ya fue utilizado o dejó de ser válido. Solicita uno nuevo.')
    }

    const clientesAsociados = await this.prisma.db.orm.public.UsuarioCliente.where({
      usuarioId: usuario.id,
    }).all();
    if (!clientesAsociados.length) {
      throw new UnauthorizedException('El acceso al portal fue revocado.');
    }

    if (usuarioNombre) {
      const usuarioExistente = await this.prisma.db.orm.public.Usuario.where({
        nombreUsuario: usuarioNombre as Varchar<80>,
      }).first();
      if (usuarioExistente && usuarioExistente.id !== usuario.id) {
        throw new BadRequestException('Ese nombre de usuario ya está en uso.');
      }
    }
    if (correo) {
      const usuarioConCorreo = await this.prisma.db.orm.public.Usuario.where({
        email: correo as Varchar<150>,
      }).first();
      if (usuarioConCorreo && usuarioConCorreo.id !== usuario.id) {
        throw new BadRequestException(
          'Ese correo electrónico ya está asociado a otra cuenta.',
        );
      }
    }

    const updated = await this.prisma.db.orm.public.Usuario.where({ id: usuario.id, passwordHash: usuario.passwordHash, activo: usuario.activo }).update({
      ...(usuarioNombre ? { nombreUsuario: usuarioNombre as Varchar<80> } : {}),
      ...(esInvitacion && correo ? { email: correo as Varchar<150>, emailVerificadoEn: null } : {}),
      passwordHash: (await argon2.hash(password)) as Varchar<255>,
      activo: true,
      actualizadoEn: Temporal.Now.instant(),
    });
    if (!updated) throw new UnauthorizedException('El enlace ya fue utilizado o dejó de ser válido.')

    return {
      mensaje: esInvitacion
        ? 'Cuenta activada. Ya puedes iniciar sesión.'
        : 'Contraseña restablecida. Ya puedes iniciar sesión.',
    };
  }

  async login(loginDto: LoginDto) {
    for (const [id, challenge] of this.loginChallenges) if (challenge.exp <= Date.now()) this.loginChallenges.delete(id)
    if (typeof loginDto?.nombreUsuario !== 'string' || loginDto.nombreUsuario.length > 150 || typeof loginDto.password !== 'string' || !loginDto.password || loginDto.password.length > 128) {
      throw new BadRequestException('Ingresa un usuario y una contraseña válidos.')
    }
    const identificador = loginDto.nombreUsuario?.trim();
    const nombreUsuario = identificador?.includes('@')
      ? identificador.toLowerCase()
      : identificador;
    let usuario = nombreUsuario
      ? await this.prisma.db.orm.public.Usuario.where({
          nombreUsuario: nombreUsuario as Varchar<80>,
        }).first()
      : null;
    if (!usuario && nombreUsuario?.includes('@')) {
      usuario = await this.prisma.db.orm.public.Usuario.where({
        email: nombreUsuario as Varchar<150>,
      }).first();
    }

    dummyPasswordHash ??= argon2.hash(randomBytes(32).toString('hex'))
    const passwordValida = await argon2.verify(usuario?.passwordHash ?? await dummyPasswordHash, loginDto.password)
    if (!usuario?.activo || !passwordValida) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const rol = await this.prisma.db.orm.public.Rol.where({ id: usuario.rolId }).first();
    const rolNombre = String(rol?.nombre ?? '').toUpperCase();

    const emailEnabled = this.emailRegistrado(usuario)
    if (usuario.twoFactorEnabled || emailEnabled) {
      if (!usuario.twoFactorSecret && !emailEnabled) throw new UnauthorizedException('No se pudo validar la autenticación en dos pasos.')
      const methods: string[] = []
      if (usuario.twoFactorEnabled && usuario.twoFactorSecret) methods.push('app')
      if (emailEnabled) methods.push('email')
      if (!methods.length) throw new ServiceUnavailableException('El servicio de verificación por correo no está disponible. Intenta nuevamente más tarde.')
      const jti = randomBytes(16).toString('hex');
      const challengeToken = await this.jwtService.signAsync(
        { sub: usuario.id.toString(), purpose: '2fa-login', jti },
        { expiresIn: '5m', secret: this.challengeSecret() },
      );
      this.loginChallenges.set(jti, { sub: usuario.id.toString(), exp: Date.now() + 5 * 60 * 1000, email: emailEnabled ? usuario.email : null, credentialVersion: credentialVersion(usuario.passwordHash) })
      return {
        requires2FA: true,
        challengeToken,
        methods,
        maskedEmail: emailEnabled ? this.ocultarEmail(usuario.email!) : null,
        mensaje: 'Ingresa el código de verificación o un código de recuperación para continuar.',
      };
    }

    return this.issueAccessToken(usuario, rolNombre);
  }

  async get2faStatus(userId: string) {
    const usuario = await this.getUsuarioById(userId);
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Sesión no válida.');
    const pending = Boolean(usuario.twoFactorTempSecret) && !usuario.twoFactorEnabled && !this.setupExpired(usuario.twoFactorSetupExpiresAt);
    return {
      enabled: Boolean(usuario.twoFactorEnabled),
      emailEnabled: this.emailRegistrado(usuario),
      emailVerified: this.emailVerificado(usuario),
      emailRegistered: this.emailRegistrado(usuario),
      emailDeliveryAvailable: this.correo?.disponible() ?? false,
      maskedEmail: usuario.email ? this.ocultarEmail(usuario.email!) : null,
      pending,
      recoveryCodesConfigured: this.parseRecoveryHashes(usuario.twoFactorRecoveryHashes).length > 0,
    };
  }

  async setup2fa(userId: string, password: string) {
    this.checkRateLimit(`setup:${userId}`, 10, 15 * 60 * 1000);
    if (!password) throw new BadRequestException('La contraseña es obligatoria.');
    const usuario = await this.getUsuarioById(userId);
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Sesión no válida.');
    if (usuario.twoFactorEnabled) throw new BadRequestException('La verificación en dos pasos ya está activada.');
    const ok = await argon2.verify(usuario.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta.');

    const secret = generateSecret();
    const label = usuario.nombreUsuario;
    const otpauthUrl = generateURI({ issuer: 'TRIBUTEK', label, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const encrypted = encryptSecret(secret);
    const expiresAt = Temporal.Instant.fromEpochMilliseconds(Date.now() + SETUP_TTL_MS);

    await this.prisma.db.orm.public.Usuario.where({ id: usuario.id }).update({
      twoFactorTempSecret: encrypted as Varchar<255>,
      twoFactorSetupExpiresAt: expiresAt,
      actualizadoEn: Temporal.Now.instant(),
    });

    return { otpauthUrl, qrCodeDataUrl, secret, expiresInSeconds: Math.floor(SETUP_TTL_MS / 1000) };
  }

  async confirm2fa(userId: string, code: string) {
    this.checkRateLimit(`confirm:${userId}`, 10, 15 * 60 * 1000);
    if (!code) throw new BadRequestException('El código es obligatorio.');
    const usuario = await this.getUsuarioById(userId);
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Sesión no válida.');
    if (usuario.twoFactorEnabled) throw new BadRequestException('La verificación en dos pasos ya está activada.');
    if (!usuario.twoFactorTempSecret) {
      throw new BadRequestException('No hay una configuración de 2FA pendiente.');
    }
    if (this.setupExpired(usuario.twoFactorSetupExpiresAt)) {
      await this.prisma.db.orm.public.Usuario.where({ id: usuario.id }).update({
        twoFactorTempSecret: null,
        twoFactorSetupExpiresAt: null,
        actualizadoEn: Temporal.Now.instant(),
      });
      throw new BadRequestException('La configuración de 2FA expiró. Inicia la configuración nuevamente.');
    }
    let plainSecret: string;
    try {
      plainSecret = readSecret(usuario.twoFactorTempSecret);
    } catch {
      throw new BadRequestException('La configuración de 2FA pendiente no es válida. Inicia la configuración nuevamente.');
    }
    const result = verifySync({ token: code.trim(), secret: plainSecret });
    if (!result.valid) throw new UnauthorizedException('Código 2FA inválido.');

    const encrypted = encryptSecret(plainSecret);
    const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'));
    const recoveryHashes = await Promise.all(recoveryCodes.map((c) => this.hashRecoveryCode(c)));
    await this.prisma.db.orm.public.Usuario.where({ id: usuario.id }).update({
      twoFactorEnabled: true,
      twoFactorSecret: encrypted as Varchar<255>,
      twoFactorTempSecret: null,
      twoFactorSetupExpiresAt: null,
      twoFactorRecoveryHashes: this.serializeRecoveryHashes(recoveryHashes) as Varchar<2000> | null,
      actualizadoEn: Temporal.Now.instant(),
    });
    // Replay guard: mark accepted step (best-effort, in-memory)
    if (typeof (result as any).timeStepUsed === 'number') {
      this.usedTotpSteps.set(usuario.id.toString(), (result as any).timeStepUsed);
    }
    this.clearRateLimit(`confirm:${userId}`);
    this.clearRateLimit(`setup:${userId}`);
    return {
      mensaje: '2FA activado correctamente.',
      recoveryCodes,
      recoveryCodesNotice: 'Guarda estos códigos en un lugar seguro. Cada código se puede usar una sola vez para recuperar el acceso y no se volverán a mostrar.',
    };
  }

  /** Intenta consumir un código de recuperación de forma atómica (comparando hashes almacenados). No desactiva 2FA. */
  private async consumeRecoveryCode(userId: bigint, code: string): Promise<boolean> {
    const normalized = this.normalizeRecoveryCode(code);
    if (!/^[a-f0-9]{8,16}$/i.test(normalized)) return false;
    return this.prisma.db.transaction(async (tx) => {
      const u = await tx.orm.public.Usuario.where({ id: userId }).first();
      if (!u || !u.twoFactorEnabled) return false;
      const hashes = this.parseRecoveryHashes(u.twoFactorRecoveryHashes);
      if (!hashes.length) return false;
      let matchIndex = -1;
      for (let i = 0; i < hashes.length; i++) {
        if (await this.verifyRecoveryCode(normalized, hashes[i])) { matchIndex = i; break; }
      }
      if (matchIndex < 0) return false;
      const remaining = hashes.filter((_, i) => i !== matchIndex);
      const oldJson = u.twoFactorRecoveryHashes as Varchar<2000> | null;
      // Actualización condicional (compare-and-set por valor previo) para consumo one-time atómico.
      const updated = await tx.orm.public.Usuario.where({
        id: userId,
        twoFactorRecoveryHashes: oldJson,
      }).update({
        twoFactorRecoveryHashes: this.serializeRecoveryHashes(remaining) as Varchar<2000> | null,
        actualizadoEn: Temporal.Now.instant(),
      });
      return Boolean(updated);
    });
  }

  private emailRegistrado(usuario: { email?: unknown }) {
    return typeof usuario.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email)
  }
  private emailVerificado(usuario: { email?: unknown, emailVerificadoEn?: unknown }) {
    return typeof usuario.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email) && Boolean(usuario.emailVerificadoEn)
  }
  private ocultarEmail(email: string) {
    const [local, domain] = email.split('@')
    return `${local.slice(0, 1)}***@${domain}`
  }
  private async validarDesafio(challengeToken: string) {
    let payload: ChallengePayload;
    try {
      payload = await this.jwtService.verifyAsync(challengeToken, {
        secret: this.challengeSecret(),
      });
    } catch {
      throw new UnauthorizedException('El desafío 2FA es inválido o expiró.');
    }
    if (payload.purpose !== '2fa-login' || !payload.sub || !payload.jti) {
      throw new UnauthorizedException('Token de desafío no válido.');
    }
    const challenge = this.loginChallenges.get(payload.jti);
    if (!challenge || challenge.sub !== payload.sub || challenge.exp < Date.now()) {
      this.loginChallenges.delete(payload.jti);
      throw new UnauthorizedException('El desafío 2FA expiró. Inicia sesión nuevamente.');
    }
    return { sub: payload.sub, jti: payload.jti, email: challenge.email, credentialVersion: challenge.credentialVersion }
  }

  async enviarCodigoIngreso(challengeToken: string) {
    if (typeof challengeToken !== 'string' || !challengeToken) throw new BadRequestException('El desafío es obligatorio.')
    const payload = await this.validarDesafio(challengeToken)
    const usuario = await this.getUsuarioById(payload.sub)
    if (!usuario?.activo || credentialVersion(usuario.passwordHash) !== payload.credentialVersion || !this.emailRegistrado(usuario) || payload.email !== usuario.email) throw new UnauthorizedException('La cuenta cambió desde que comenzó este intento. Inicia sesión nuevamente.')
    if (!this.correo) throw new ServiceUnavailableException('El envío de correo no está disponible.')
    const sent = await this.correo.enviar(`${payload.sub}:login:${payload.jti}`, usuario.email!, 'login', `${payload.sub}:login`)
    return { ...sent, maskedEmail: this.ocultarEmail(usuario.email!) }
  }

  async solicitarVerificacionMiCorreo(userId: string, password: string) {
    this.checkRateLimit(`email-enroll:${userId}`, 5, 15 * 60 * 1000)
    const usuario = await this.getUsuarioById(userId)
    if (!usuario?.activo) throw new UnauthorizedException('Sesión no válida.')
    if (!usuario.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email)) throw new BadRequestException('Registra un correo válido con la responsable de tu cuenta antes de verificarlo.')
    if (typeof password !== 'string' || !password || !(await argon2.verify(usuario.passwordHash, password))) throw new UnauthorizedException('Contraseña incorrecta.')
    if (!this.correo) throw new ServiceUnavailableException('El envío de correo no está disponible.')
    const sent = await this.correo.enviar(`${userId}:email-enrollment`, usuario.email, 'email-enrollment')
    return { ...sent, maskedEmail: this.ocultarEmail(usuario.email) }
  }

  async confirmarMiCorreo(userId: string, code: string) {
    const usuario = await this.getUsuarioById(userId)
    if (!usuario?.activo || !usuario.email) throw new UnauthorizedException('Sesión no válida.')
    if (!this.correo || typeof code !== 'string') throw new BadRequestException('Solicita primero el código de verificación.')
    this.correo.consumir(`${userId}:email-enrollment`, usuario.email, code)
    const updated = await this.prisma.db.orm.public.Usuario.where({ id: usuario.id, email: usuario.email }).update({ emailVerificadoEn: Temporal.Now.instant(), actualizadoEn: Temporal.Now.instant() })
    if (!updated) throw new BadRequestException('El correo cambió. Solicita un código para la dirección actual.')
    return { mensaje: 'Correo verificado. Ya puedes elegirlo como método al iniciar sesión.' }
  }

  async verify2fa(challengeToken: string, code: string, method: 'app' | 'email' = 'app') {
    if (!['app', 'email'].includes(method)) throw new BadRequestException('Método de verificación inválido.')
    if (typeof challengeToken !== 'string' || typeof code !== 'string' || !challengeToken || !code) {
      throw new BadRequestException('Token de desafío y código son obligatorios.');
    }
    const payload = await this.validarDesafio(challengeToken)
    this.checkRateLimit(`verify:${payload.sub}`, 8, 10 * 60 * 1000);

    const usuario = await this.getUsuarioById(payload.sub);
    if (!usuario || !usuario.activo || credentialVersion(usuario.passwordHash) !== payload.credentialVersion) throw new UnauthorizedException('No se pudo validar la autenticación en dos pasos.')
    const trimmed = code.trim();
    let usedRecovery = false;
    if (method === 'email') {
      if (!this.emailRegistrado(usuario) || !this.correo || payload.email !== usuario.email) throw new UnauthorizedException('No hay un correo válido para este intento de ingreso.')
      this.correo.consumir(`${payload.sub}:login:${payload.jti}`, usuario.email!, trimmed)
      if (!usuario.emailVerificadoEn) {
        const confirmed = await this.prisma.db.orm.public.Usuario.where({ id: usuario.id, email: usuario.email }).update({ emailVerificadoEn: Temporal.Now.instant(), actualizadoEn: Temporal.Now.instant() })
        if (!confirmed) throw new UnauthorizedException('El correo cambió durante la verificación. Inicia sesión nuevamente.')
      }
    } else {
      if (!usuario.twoFactorEnabled || !usuario.twoFactorSecret) throw new UnauthorizedException('La app autenticadora no está configurada.')

    // Intentar TOTP primero (6 dígitos), si no aplica o falla intentar código de recuperación.
    let totpValid = false;
    let totpStep: number | undefined;
    if (/^\d{6,8}$/.test(trimmed)) {
      try {
        const plainSecret = readSecret(usuario.twoFactorSecret);
        const result = verifySync({ token: trimmed, secret: plainSecret });
        totpValid = result.valid;
        if (typeof (result as any).timeStepUsed === 'number') totpStep = (result as any).timeStepUsed;
      } catch {
        totpValid = false;
      }
    }

    if (totpValid) {
      // Best-effort replay prevention (in-memory per process)
      const step = totpStep ?? Math.floor(Date.now() / 30000);
      const last = this.usedTotpSteps.get(usuario.id.toString());
      if (typeof last === 'number' && step <= last) {
        throw new UnauthorizedException('El código ya fue utilizado. Espera un nuevo código.');
      }
      this.usedTotpSteps.set(usuario.id.toString(), step);
    } else {
      // Recuperación: consumir hash de forma atómica y one-time; NO desactiva 2FA.
      usedRecovery = await this.consumeRecoveryCode(usuario.id, trimmed);
      if (!usedRecovery) {
        throw new UnauthorizedException('Código 2FA o de recuperación inválido.');
      }
    }

    }
    this.correo?.descartar(`${payload.sub}:login:${payload.jti}`)
    this.loginChallenges.delete(payload.jti);
    this.clearRateLimit(`verify:${payload.sub}`);

    const rol = await this.prisma.db.orm.public.Rol.where({ id: usuario.rolId }).first();
    const rolNombre = String(rol?.nombre ?? '').toUpperCase();
    const issued = await this.issueAccessToken(usuario, rolNombre);
    if (usedRecovery) {
      (issued as any).recoveryCodeUsed = true;
      (issued as any).mensaje = 'Inicio de sesión exitoso con código de recuperación. 2FA sigue activo.';
    }
    return issued;
  }

  /** Vuelve a mostrar el QR vigente solo tras contraseña y un código de recuperación de uso único. */
  async relink2fa(userId: string, password: string, recoveryCode: string) {
    this.checkRateLimit(`relink:${userId}`, 5, 15 * 60 * 1000)
    if (typeof password !== 'string' || typeof recoveryCode !== 'string' || !password || !recoveryCode) {
      throw new BadRequestException('Ingresa tu contraseña y un código de recuperación que no hayas usado.')
    }
    const usuario = await this.getUsuarioById(userId)
    if (!usuario?.activo || !usuario.twoFactorEnabled || !usuario.twoFactorSecret) throw new BadRequestException('No hay una aplicación autenticadora activa para volver a vincular.')
    if (!(await argon2.verify(usuario.passwordHash, password))) throw new UnauthorizedException('Contraseña incorrecta.')
    const secret = readSecret(usuario.twoFactorSecret)
    const otpauthUrl = generateURI({ issuer: 'TRIBUTEK', label: usuario.nombreUsuario, secret })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)
    if (!(await this.consumeRecoveryCode(usuario.id, recoveryCode))) throw new UnauthorizedException('El código de recuperación no es válido o ya fue usado.')
    this.clearRateLimit(`relink:${userId}`)
    return { qrCodeDataUrl, secret, mensaje: 'Escanea el QR desde tu aplicación autenticadora y comprueba su código. La protección sigue activada.' }
  }

  async confirmRelink2fa(userId: string, code: string) {
    this.checkRateLimit(`relink-confirm:${userId}`, 8, 10 * 60 * 1000)
    const usuario = await this.getUsuarioById(userId)
    if (!usuario?.activo || !usuario.twoFactorEnabled || !usuario.twoFactorSecret) throw new UnauthorizedException('No se puede comprobar esta vinculación.')
    if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !verifySync({ token: code, secret: readSecret(usuario.twoFactorSecret) }).valid) throw new UnauthorizedException('El código no coincide. Comprueba la cuenta elegida y la hora automática de tu teléfono.')
    this.clearRateLimit(`relink-confirm:${userId}`)
    return { mensaje: 'Aplicación vinculada y código comprobado. Ya puedes usarla para iniciar sesión.' }
  }

  async disable2fa(userId: string, password: string, code?: string) {
    this.checkRateLimit(`disable:${userId}`, 10, 15 * 60 * 1000);
    if (!password) throw new BadRequestException('La contraseña es obligatoria.');
    const usuario = await this.getUsuarioById(userId);
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Sesión no válida.');
    const ok = await argon2.verify(usuario.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Contraseña incorrecta.');
    if (!usuario.twoFactorEnabled) {
      return { mensaje: 'La app autenticadora ya estaba desactivada.' };
    }
    if (!usuario.twoFactorSecret) {
      throw new BadRequestException('No se pudo verificar la configuración 2FA.');
    }
    if (!code) throw new BadRequestException('El código 2FA es obligatorio para desactivar.');
    let plainSecret: string;
    try {
      plainSecret = readSecret(usuario.twoFactorSecret);
    } catch {
      throw new UnauthorizedException('No se pudo validar la autenticación en dos pasos.');
    }
    const valid = verifySync({ token: code.trim(), secret: plainSecret }).valid;
    if (!valid) throw new UnauthorizedException('Código 2FA inválido.');
    await this.prisma.db.orm.public.Usuario.where({ id: usuario.id }).update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorSetupExpiresAt: null,
      twoFactorRecoveryHashes: null,
      actualizadoEn: Temporal.Now.instant(),
    });
    this.usedTotpSteps.delete(usuario.id.toString());
    this.clearRateLimit(`disable:${userId}`);
    return { mensaje: 'App autenticadora desactivada. Si tu correo está verificado, el ingreso por correo sigue disponible.' };
  }
}
