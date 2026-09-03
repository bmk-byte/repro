/**
 * Client-side authorization vocabulary.
 *
 * This is a UI-layer convenience, not a security boundary — the app has no
 * server-side API routes of its own, so every mutation goes straight through
 * `supabase-js` and is actually enforced by Postgres Row Level Security
 * (see supabase/migrations/20251204050602_organization_based_case_access_control.sql
 * and the RLS policies it builds on). A bug here can hide or show a button
 * incorrectly; it cannot grant real access, because RLS re-checks every
 * write server-side regardless of what the client believes.
 *
 * Three roles today: member, moderator, and admin. Admin is a strict
 * superset of moderator (see supabase/migrations/20260903080000_add_admin_role.sql
 * for how that's enforced at the DB layer — `current_user_is_moderator()`
 * now also admits admins) — `ROLE_PERMISSIONS.admin` mirrors that by
 * including every moderator permission plus admin-only ones, rather than
 * modeling admin's DB-level full RLS bypass as an app-level permission list
 * (there's nothing meaningful to enumerate for "sees/edits everything").
 */

export type Role = 'member' | 'moderator' | 'admin';

export type Permission =
  | 'case:moderate'      // approve/reject a submitted case
  | 'case:approve'       // route/admit a case into the case list
  | 'judgment:moderate'  // approve/reject a submitted judgment
  | 'rapid_response:manage' // view/manage the rapid-response case queue
  | 'moderator:grant'    // grant moderator status to another user
  | 'moderator:revoke'   // revoke moderator status from another user
  | 'law:upload'         // upload a law document directly (bypassing submission review)
  | 'resource:upload'    // upload a resource document directly
  | 'admin:grant'        // grant admin status to another user
  | 'admin:revoke';      // revoke admin status from another user

const MODERATOR_PERMISSIONS: Permission[] = [
  'case:moderate',
  'case:approve',
  'judgment:moderate',
  'rapid_response:manage',
  'law:upload',
  'resource:upload',
];

// Granting/revoking moderator status is admin-only, not a moderator
// capability — moderating content and managing who else can moderate are
// deliberately separate (see supabase/migrations/
// 20260903090000_restrict_moderator_management_to_admins.sql).
const ADMIN_PERMISSIONS: Permission[] = [
  ...MODERATOR_PERMISSIONS,
  'moderator:grant',
  'moderator:revoke',
  'admin:grant',
  'admin:revoke',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  member: [],
  moderator: MODERATOR_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

export interface CallerRoles {
  /** "has moderator-or-higher access" — see useModeratorStatus.ts. */
  isModerator: boolean;
  isAdmin: boolean;
}

/**
 * @param roles the caller's role flags, as resolved by `useModeratorStatus()`
 *   (backed by the DB-trigger-protected `profiles.is_moderator`/`is_admin`
 *   columns — see that hook for why they're trustworthy as a UI signal even
 *   though they're still not the enforcement layer).
 */
export function can(roles: CallerRoles, permission: Permission): boolean {
  const role: Role = roles.isAdmin ? 'admin' : roles.isModerator ? 'moderator' : 'member';
  return ROLE_PERMISSIONS[role].includes(permission);
}
