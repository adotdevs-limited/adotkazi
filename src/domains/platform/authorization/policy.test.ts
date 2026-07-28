import { describe, expect, it } from "vitest";

import { can, requirePermission, ForbiddenError, type ActiveMembership } from "./policy";

function membershipWith(permissions: ActiveMembership["permissions"]): ActiveMembership {
  return {
    membershipId: "membership_1",
    organizationId: "org_1",
    organizationName: "Test Org",
    organizationSlug: "test-org",
    userId: "user_1",
    roleId: "role_1",
    roleName: "Viewer",
    permissions,
  };
}

describe("can", () => {
  it("returns true when the membership's role grants the permission", () => {
    const membership = membershipWith(new Set(["organization.view"]));
    expect(can(membership, "organization.view")).toBe(true);
  });

  it("returns false when the membership's role does not grant the permission", () => {
    const membership = membershipWith(new Set(["organization.view"]));
    expect(can(membership, "organization.update")).toBe(false);
  });

  it("denies by default for an empty permission set", () => {
    const membership = membershipWith(new Set());
    expect(can(membership, "organization.view")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when the permission is granted", () => {
    const membership = membershipWith(new Set(["membership.invite"]));
    expect(() => requirePermission(membership, "membership.invite")).not.toThrow();
  });

  it("throws ForbiddenError when the permission is missing", () => {
    const membership = membershipWith(new Set());
    expect(() => requirePermission(membership, "membership.invite")).toThrow(ForbiddenError);
  });
});
