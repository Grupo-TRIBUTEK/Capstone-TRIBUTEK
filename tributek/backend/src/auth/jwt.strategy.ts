/**
 * Configura la verificación del token JWT y la identidad que queda disponible en request.user.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js'
import { credentialVersion } from './credential-version.js'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET']!,
      algorithms: ['HS256'],
    });
  }

  /** Construye request.user desde el JWT verificado por Passport para identificar la sesión en guards y controladores. */
  async validate(payload: {
    sub: string;
    nombreUsuario?: string;
    rolId?: string;
    rolNombre?: string;
    purpose?: string;
    credentialVersion?: string
  }) {
    // Rechazar explícitamente cualquier token temporal de 2FA u otro propósito no-acceso.
    if (payload.purpose === '2fa-login') {
      throw new UnauthorizedException('Token temporal de 2FA no válido para acceso.');
    }
    if (payload.purpose && payload.purpose !== 'access') {
      throw new UnauthorizedException('Token no válido para acceso.');
    }
    if (typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub) || !payload.nombreUsuario || !payload.rolId || !payload.credentialVersion) {
      throw new UnauthorizedException('Token de acceso inválido.');
    }
    const usuario = await this.prisma.db.orm.public.Usuario.where({ id: BigInt(payload.sub) }).first()
    if (!usuario?.activo || String(usuario.rolId) !== payload.rolId || credentialVersion(usuario.passwordHash) !== payload.credentialVersion) {
      throw new UnauthorizedException('La sesión ya no está vigente. Vuelve a iniciar sesión.')
    }
    const rol = await this.prisma.db.orm.public.Rol.where({ id: usuario.rolId }).first()
    if (!rol) throw new UnauthorizedException('La sesión ya no está vigente.')
    return {
      id: String(usuario.id),
      nombreUsuario: usuario.nombreUsuario,
      rolId: String(usuario.rolId),
      rolNombre: String(rol.nombre),
    };
  }
}
