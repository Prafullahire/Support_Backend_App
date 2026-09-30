import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums';
import { isPrivilegedAdmin, isSuperAdmin } from '../constants/roles.constants';

export interface ScopedUser {
  id: string;
  role: UserRole;
  branchId?: string | null;
}

/** Returns branchId filter for list queries. SUPER_ADMIN may filter optionally; ADMIN is locked to their branch. */
export function resolveBranchFilter(
  user: ScopedUser,
  requestedBranchId?: string,
): { branchId?: string } {
  if (isSuperAdmin(user.role)) {
    return requestedBranchId ? { branchId: requestedBranchId } : {};
  }

  if (user.role === UserRole.ADMIN) {
    if (!user.branchId) {
      return { branchId: '__no_branch__' };
    }
    return { branchId: user.branchId };
  }

  return {};
}

export function resolveBranchId(user: ScopedUser, requestedBranchId?: string): string | undefined {
  return resolveBranchFilter(user, requestedBranchId).branchId;
}

export function assertBranchAccess(user: ScopedUser, recordBranchId?: string | null): void {
  if (isSuperAdmin(user.role)) return;
  if (user.role === UserRole.ADMIN && user.branchId && recordBranchId === user.branchId) return;
  throw new ForbiddenException('You do not have access to this branch data');
}

export function enforceActorBranchId(user: ScopedUser, requestedBranchId?: string): string | undefined {
  if (isSuperAdmin(user.role)) {
    return requestedBranchId;
  }
  if (user.role === UserRole.ADMIN) {
    if (!user.branchId) {
      throw new ForbiddenException('Your admin account is not assigned to a branch');
    }
    return user.branchId;
  }
  return requestedBranchId;
}

export function canAssignRole(actor: ScopedUser, targetRole: UserRole): boolean {
  if (isSuperAdmin(actor.role)) return true;
  if (actor.role === UserRole.ADMIN) {
    return targetRole === UserRole.ADMIN || targetRole === UserRole.OFFICE_BOY;
  }
  return false;
}

export function adminListFilter(user: ScopedUser): { branchId?: string } {
  return resolveBranchFilter(user);
}

export function usesAdminDataScope(role: UserRole): boolean {
  return isPrivilegedAdmin(role);
}
