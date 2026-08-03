import type { PermissionKey } from "./permissions";

/**
 * Organization-scoped system roles, per AUTHORIZATION.md's permission
 * matrix. Recruitment-focused roles (Recruiter, Hiring Manager, Interviewer)
 * now carry their Opportunity Engine grants; Supervisor stays IPT-focused
 * and gains permissions once that bounded context is built.
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
      "opportunity.view",
      "opportunity.create",
      "opportunity.update",
      "opportunity.publish",
      "opportunity.archive",
      "pipeline.manage",
      "application.view",
      "application.update",
      "interview.manage",
      "interview.feedback",
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
      "opportunity.view",
      "opportunity.create",
      "opportunity.update",
      "opportunity.publish",
      "opportunity.archive",
      "pipeline.manage",
      "application.view",
      "application.update",
      "interview.manage",
      "interview.feedback",
    ],
  },
  {
    name: "Recruiter",
    description: "Manages recruitment: creates, publishes, and closes opportunities.",
    isDefault: true,
    permissions: [
      "organization.view",
      "membership.view",
      "opportunity.view",
      "opportunity.create",
      "opportunity.update",
      "opportunity.publish",
      "opportunity.archive",
      "application.view",
      "application.update",
      "interview.manage",
      "interview.feedback",
    ],
  },
  {
    name: "Hiring Manager",
    description: "Reviews and decides on candidates for their opportunities.",
    isDefault: false,
    // Full org-wide grant for now — there's no HiringTeam-assignment UI yet
    // to scope this down to only the manager's own opportunities. Narrow
    // once HiringTeam management ships.
    permissions: [
      "organization.view",
      "membership.view",
      "opportunity.view",
      "opportunity.update",
      "application.view",
      "application.update",
      "interview.manage",
      "interview.feedback",
    ],
  },
  {
    name: "Interviewer",
    description: "Conducts interviews and submits feedback.",
    isDefault: false,
    permissions: [
      "organization.view",
      "opportunity.view",
      "application.view",
      "interview.feedback",
    ],
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
    permissions: [
      "organization.view",
      "membership.view",
      "audit.view",
      "opportunity.view",
      "application.view",
    ],
  },
];

export const DEFAULT_MEMBER_ROLE_NAME = "Recruiter";
export const OWNER_ROLE_NAME = "Owner";
