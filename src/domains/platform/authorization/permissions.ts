/**
 * Platform permission catalog. Keys follow the `resource.action` convention
 * from AUTHORIZATION.md. Additional permissions are added here as each
 * bounded context (Recruitment, IPT, AI, ...) is implemented — this file
 * only declares what real features exist today.
 */
export const PERMISSIONS = [
  {
    key: "organization.view",
    name: "View organization",
    description: "View organization profile, branches, and departments.",
    module: "platform",
  },
  {
    key: "organization.update",
    name: "Update organization",
    description: "Edit organization profile, branding, and settings.",
    module: "platform",
  },
  {
    key: "organization.suspend",
    name: "Suspend organization",
    description: "Suspend or reactivate the organization.",
    module: "platform",
  },
  {
    key: "branch.manage",
    name: "Manage branches",
    description: "Create, update, and remove branches.",
    module: "platform",
  },
  {
    key: "department.manage",
    name: "Manage departments",
    description: "Create, update, and remove departments.",
    module: "platform",
  },
  {
    key: "membership.view",
    name: "View members",
    description: "View organization members and their roles.",
    module: "platform",
  },
  {
    key: "membership.invite",
    name: "Invite members",
    description: "Invite new members to the organization.",
    module: "platform",
  },
  {
    key: "membership.manage",
    name: "Manage members",
    description: "Change member roles or remove members.",
    module: "platform",
  },
  {
    key: "role.manage",
    name: "Manage roles",
    description: "Create and edit custom roles and their permissions.",
    module: "platform",
  },
  {
    key: "settings.manage",
    name: "Manage settings",
    description: "Edit organization-wide configuration.",
    module: "platform",
  },
  {
    key: "audit.view",
    name: "View audit log",
    description: "View the organization's audit history.",
    module: "administration",
  },
  {
    key: "opportunity.view",
    name: "View opportunities",
    description: "View opportunities.",
    module: "recruitment",
  },
  {
    key: "opportunity.create",
    name: "Create opportunities",
    description: "Create opportunities.",
    module: "recruitment",
  },
  {
    key: "opportunity.update",
    name: "Edit opportunities",
    description: "Edit opportunities.",
    module: "recruitment",
  },
  {
    key: "opportunity.publish",
    name: "Publish opportunities",
    description: "Publish, schedule, pause, and resume opportunities.",
    module: "recruitment",
  },
  {
    key: "opportunity.archive",
    name: "Archive opportunities",
    description: "Close, archive, and delete opportunities.",
    module: "recruitment",
  },
  {
    key: "pipeline.manage",
    name: "Manage pipelines",
    description: "Create and edit recruitment pipelines.",
    module: "recruitment",
  },
  {
    key: "application.view",
    name: "View applications",
    description: "View applicants and their details.",
    module: "recruitment",
  },
  {
    key: "application.update",
    name: "Update applications",
    description:
      "Move applications through pipeline stages, reject, reactivate, and extend or withdraw offers.",
    module: "recruitment",
  },
  {
    key: "interview.manage",
    name: "Manage interviews",
    description: "Schedule, cancel, and complete interviews.",
    module: "recruitment",
  },
  {
    key: "interview.feedback",
    name: "Submit interview feedback",
    description: "Submit feedback for interviews you're assigned to.",
    module: "recruitment",
  },
  {
    key: "placement.manage",
    name: "Manage placements",
    description: "Approve placements, assign supervisors, and manage placement status.",
    module: "recruitment",
  },
  {
    key: "placement.view",
    name: "View placements",
    description: "View placement details, including placements you supervise.",
    module: "recruitment",
  },
  {
    key: "daily_log.review",
    name: "Review daily logs",
    description: "Approve or return students' daily activity logs for placements you supervise.",
    module: "recruitment",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
