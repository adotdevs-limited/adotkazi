import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { listOrganizationsForUser } from "@/domains/platform/organizations/organization.repository";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);
  const memberships = await listOrganizationsForUser(user.id);

  const organizations = memberships.map((m) => ({
    organizationId: m.organizationId,
    name: m.organization.name,
    roleName: m.role.name,
  }));

  return (
    <div className="grid min-h-svh grid-cols-[16rem_1fr]">
      <aside className="border-sidebar-border bg-sidebar flex flex-col gap-4 border-r p-3">
        <OrgSwitcher
          organizations={organizations}
          activeOrganizationId={membership.organizationId}
        />
        <SidebarNav />
        <div className="mt-auto">
          <UserMenu name={user.name} email={user.email} image={user.image} />
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-12 items-center justify-end border-b px-4">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
