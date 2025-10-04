import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type UserRole = "USER" | "MODERATOR" | "ADMIN";

/**
 * Get current session or redirect to sign in
 */
export async function requireAuth() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  return session;
}

/**
 * Check if user has required role
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[],
): Promise<boolean> {
  const session = await auth();

  if (!session || !session.user) {
    return false;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(session.user.role);
}

/**
 * Require user to have specific role or redirect
 */
export async function requireRoleOrRedirect(
  allowedRoles: UserRole | UserRole[],
  redirectTo: string = "/",
) {
  const hasRole = await requireRole(allowedRoles);

  if (!hasRole) {
    redirect(redirectTo);
  }

  const session = await auth();
  return session!;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return requireRole("ADMIN");
}

/**
 * Check if user is moderator or admin
 */
export async function isModerator(): Promise<boolean> {
  return requireRole(["MODERATOR", "ADMIN"]);
}

/**
 * Get current user or null
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Check if user owns resource
 */
export async function canModifyResource(
  resourceUserId: string,
): Promise<boolean> {
  const session = await auth();

  if (!session || !session.user) {
    return false;
  }

  // Admins and moderators can modify anything
  if (session.user.role === "ADMIN" || session.user.role === "MODERATOR") {
    return true;
  }

  // Users can only modify their own resources
  return session.user.id === resourceUserId;
}
