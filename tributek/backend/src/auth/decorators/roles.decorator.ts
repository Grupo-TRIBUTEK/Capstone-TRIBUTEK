/**
 * Declara los roles requeridos como metadatos; RolesGuard los consulta para decidir el acceso.
 */
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Asocia la lista de roles a los metadatos de la ruta para que RolesGuard la lea. */
export const Roles = (...roles: Array<number | string>) => SetMetadata(ROLES_KEY, roles);
