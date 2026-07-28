import type { PermissionKey } from "./permissions";

/**
 * Organization-scoped system roles, per AUTHORIZATION.md's permission
 * matrix. Roles that belong to modules not yet implemented (Recruiter,
 * Hiring Manager, Interviewer, Supervisor) exist so organizations can invite
 * people into the correct role today; their permission grants grow as the
 * Recruitment and IPT bounded contexts are built.
 */
export const SYSTEM_ROLES: Array<{
  name: string;
  description: string;
  isDefault: boolean;
  permissions: PermissionKey[];
}> = [
  {
    name: "Owner",
    description: "Full control over the organization, including billing and destructive actions.",
    isDefault: false,
    permissions: [
      "organization.view",
      "organization.update",
      "organization.suspend",
      "branch.manage",
      "department.manage",
      "membership.view",
      "membership.invite",
      "membership.manage",
      "role.manage",
      "settings.manage",
      "audit.view",
    ],
  },
  {
    name: "Admin",
    description: "Manages day-to-day organization configuration and membership.",
    isDefault: false,
    permissions: [
      "organization.view",
      "organization.update",
      "branch.manage",
      "department.manage",
      "membership.view",
      "membership.invite",
      "membership.manage",
      "settings.manage",
      "audit.view",
    ],
  },
  {
    name: "Recruiter",
    description: "Manages recruitment (permissions expand once the Recruitment module ships).",
    isDefault: true,
    permissions: ["organization.view", "membership.view"],
  },
  {
    name: "Hiring Manager",
    description: "Reviews and decides on candidates for their opportunities.",
    isDefault: false,
    permissions: ["organization.view", "membership.view"],
  },
  {
    name: "Interviewer",
    description: "Conducts interviews and submits feedback.",
    isDefault: false,
    permissions: ["organization.view"],
  },
  {
    name: "Supervisor",
    description: "Supervises IPT/internship placements (permissions expand with the IPT module).",
    isDefault: false,
    permissions: ["organization.view"],
  },
  {
    name: "Viewer",
    description: "Read-only access to the organization.",
    isDefault: false,
    permissions: ["organization.view", "membership.view", "audit.view"],
  },
];

export const DEFAULT_MEMBER_ROLE_NAME = "Recruiter";
export const OWNER_ROLE_NAME = "Owner";
