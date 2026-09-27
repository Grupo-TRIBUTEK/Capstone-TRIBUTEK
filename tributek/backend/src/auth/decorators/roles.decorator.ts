import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<number | string>) => SetMetadata(ROLES_KEY, roles);
