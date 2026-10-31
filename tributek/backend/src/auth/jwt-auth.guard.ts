/**
 * Activa la estrategia JWT de Passport para exigir una sesión válida en las rutas que lo utilizan.
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
