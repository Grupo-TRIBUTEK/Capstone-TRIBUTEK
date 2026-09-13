import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<number[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // Si la ruta no tiene @Roles(), permite el acceso.
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Usuario obtenido después de validar el JWT.
    const usuario = request.user;

    if (!usuario || !roles.includes(Number(usuario.rolId))) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }
}