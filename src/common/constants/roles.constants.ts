import { UserRole } from '../enums';

export const ADMIN_ACCESS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export function isPrivilegedAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}
