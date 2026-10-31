/**
 * Configura la verificación del token JWT y la identidad que queda disponible en request.user.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET']!,
    });
  }

  /** Construye request.user desde el JWT verificado por Passport para identificar la sesión en guards y controladores. */
  async validate(payload: {
    sub: string;
    nombreUsuario: string;
    rolId: string;
    rolNombre?: string;
  }) {
    return {
      id: payload.sub,
      nombreUsuario: payload.nombreUsuario,
      rolId: payload.rolId,
      rolNombre: payload.rolNombre,
    };
  }
}
