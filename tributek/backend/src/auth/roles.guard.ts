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
    const roles = this.reflector.get<Array<number | string>>(
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

    const permitido = usuario && roles.some((rol) => {
      if (typeof rol === 'number') return Number(usuario.rolId) === rol;
      const nombreRol = String(usuario.rolNombre ?? '').toUpperCase();
      const rolRequerido = rol.toUpperCase();
      return nombreRol === rolRequerido ||
        (rolRequerido === 'ADMIN' && nombreRol === 'ADMINISTRADOR');
    });

    if (!permitido) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
