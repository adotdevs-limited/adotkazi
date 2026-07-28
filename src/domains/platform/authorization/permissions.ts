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
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
