export type UserRole = "admin" | "user";

export interface UserMetadata {
  role: UserRole;
}

export function hasPermission(
  role: UserRole | undefined,
  requiredRole: UserRole,
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return role === requiredRole;
}
