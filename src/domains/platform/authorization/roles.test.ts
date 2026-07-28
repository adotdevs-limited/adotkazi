import { describe, expect, it } from "vitest";

import { PERMISSIONS, type PermissionKey } from "./permissions";
import { DEFAULT_MEMBER_ROLE_NAME, OWNER_ROLE_NAME, SYSTEM_ROLES } from "./roles";

describe("RBAC catalog integrity", () => {
  const validKeys = new Set<PermissionKey>(PERMISSIONS.map((p) => p.key));

  it("has no duplicate permission keys", () => {
    expect(validKeys.size).toBe(PERMISSIONS.length);
  });

  it("has no duplicate system role names", () => {
    const names = SYSTEM_ROLES.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only grants permissions that exist in the catalog", () => {
    for (const role of SYSTEM_ROLES) {
      for (const permission of role.permissions) {
        expect(
          validKeys.has(permission),
          `${role.name} grants unknown permission "${permission}"`,
        ).toBe(true);
      }
    }
  });

  it("defines the Owner role referenced by organization creation", () => {
    expect(SYSTEM_ROLES.some((r) => r.name === OWNER_ROLE_NAME)).toBe(true);
  });

  it("has exactly one default role for new invitations", () => {
    const defaults = SYSTEM_ROLES.filter((r) => r.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.name).toBe(DEFAULT_MEMBER_ROLE_NAME);
  });

  it("grants the Owner role every permission in the catalog", () => {
    const owner = SYSTEM_ROLES.find((r) => r.name === OWNER_ROLE_NAME);
    expect(owner).toBeDefined();
    for (const permission of PERMISSIONS) {
      expect(owner?.permissions).toContain(permission.key);
    }
  });
});
