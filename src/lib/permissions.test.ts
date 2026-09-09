import { describe, it, expect } from 'vitest';
import { can, ROLE_PERMISSIONS, type CallerRoles, type Permission } from './permissions';

/**
 * permissions.ts is documented as a UI-only convenience layer — these
 * tests verify that convenience layer behaves consistently, not that it
 * enforces security. Real authorization is PostgreSQL RLS/triggers/
 * SECURITY DEFINER functions (see supabase/migrations/). A passing test
 * here says nothing about server-side enforcement.
 */

const member: CallerRoles = { isModerator: false, isAdmin: false };
const moderator: CallerRoles = { isModerator: true, isAdmin: false };
const admin: CallerRoles = { isModerator: false, isAdmin: true }; // isAdmin alone should still resolve to admin
const adminAndModerator: CallerRoles = { isModerator: true, isAdmin: true };

const ALL_PERMISSIONS = Object.values(ROLE_PERMISSIONS).flat() as Permission[];
const UNIQUE_PERMISSIONS = Array.from(new Set(ALL_PERMISSIONS));

describe('permissions.ts — role determination', () => {
  it('ordinary members have no permissions at all', () => {
    for (const permission of UNIQUE_PERMISSIONS) {
      expect(can(member, permission)).toBe(false);
    }
  });

  it('resolves to member when both role flags are false', () => {
    expect(ROLE_PERMISSIONS.member).toEqual([]);
  });

  it('admin is a strict superset of moderator permissions', () => {
    for (const permission of ROLE_PERMISSIONS.moderator) {
      expect(ROLE_PERMISSIONS.admin).toContain(permission);
    }
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.moderator.length);
  });

  it('isAdmin alone (without isModerator) still resolves to the admin role', () => {
    // Mirrors the DB-level model: admin does not require is_moderator=true
    // separately (see 20260903080000_add_admin_role.sql).
    for (const permission of ROLE_PERMISSIONS.admin) {
      expect(can(admin, permission)).toBe(true);
    }
  });

  it('isAdmin takes precedence when both isModerator and isAdmin are true', () => {
    for (const permission of ROLE_PERMISSIONS.admin) {
      expect(can(adminAndModerator, permission)).toBe(true);
    }
  });
});

describe('permissions.ts — moderator checks', () => {
  it('moderators can moderate cases and judgments', () => {
    expect(can(moderator, 'case:moderate')).toBe(true);
    expect(can(moderator, 'judgment:moderate')).toBe(true);
  });

  it('moderators can approve cases and manage the rapid-response queue', () => {
    expect(can(moderator, 'case:approve')).toBe(true);
    expect(can(moderator, 'rapid_response:manage')).toBe(true);
  });

  it('moderators can upload laws and resources directly', () => {
    expect(can(moderator, 'law:upload')).toBe(true);
    expect(can(moderator, 'resource:upload')).toBe(true);
  });

  it('moderators cannot grant or revoke moderator status (admin-only, per 20260903090000)', () => {
    expect(can(moderator, 'moderator:grant')).toBe(false);
    expect(can(moderator, 'moderator:revoke')).toBe(false);
  });

  it('moderators cannot grant or revoke admin status', () => {
    expect(can(moderator, 'admin:grant')).toBe(false);
    expect(can(moderator, 'admin:revoke')).toBe(false);
  });
});

describe('permissions.ts — administrator checks', () => {
  it('admins retain every moderator permission', () => {
    expect(can(admin, 'case:moderate')).toBe(true);
    expect(can(admin, 'judgment:moderate')).toBe(true);
    expect(can(admin, 'case:approve')).toBe(true);
    expect(can(admin, 'rapid_response:manage')).toBe(true);
    expect(can(admin, 'law:upload')).toBe(true);
    expect(can(admin, 'resource:upload')).toBe(true);
  });

  it('only admins can grant/revoke moderator status', () => {
    expect(can(admin, 'moderator:grant')).toBe(true);
    expect(can(admin, 'moderator:revoke')).toBe(true);
  });

  it('only admins can grant/revoke admin status', () => {
    expect(can(admin, 'admin:grant')).toBe(true);
    expect(can(admin, 'admin:revoke')).toBe(true);
  });
});

describe('permissions.ts — permission boundaries / edge cases', () => {
  it('every ROLE_PERMISSIONS entry only contains permissions from the Permission union (no typos)', () => {
    const validPermissions: Permission[] = [
      'case:moderate', 'case:approve', 'judgment:moderate', 'rapid_response:manage',
      'moderator:grant', 'moderator:revoke', 'law:upload', 'resource:upload',
      'admin:grant', 'admin:revoke',
    ];
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(validPermissions).toContain(p);
      }
    }
  });

  it('member role list is not mutated by reading permissions (ROLE_PERMISSIONS.member stays empty across calls)', () => {
    can(member, 'case:moderate');
    can(member, 'admin:grant');
    expect(ROLE_PERMISSIONS.member).toEqual([]);
  });

  it('does not grant any permission that is not explicitly listed for the resolved role', () => {
    const grantedToModerator = new Set(ROLE_PERMISSIONS.moderator);
    for (const permission of UNIQUE_PERMISSIONS) {
      expect(can(moderator, permission)).toBe(grantedToModerator.has(permission));
    }
  });
});
