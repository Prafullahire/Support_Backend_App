import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';
import { ADMIN_ACCESS_ROLES } from '../constants/roles.constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const AdminRoles = () => SetMetadata(ROLES_KEY, ADMIN_ACCESS_ROLES);
