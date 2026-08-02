import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { prisma } from "@/lib/db";
import { findOrganizationSettings } from "@/domains/platform/organizations/organization.repository";
import { listDepartmentsWithOpportunityCounts } from "@/domains/platform/departments/department.repository";
import { listBranchesWithOpportunityCounts } from "@/domains/platform/branches/branch.repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import { DepartmentManager } from "@/components/settings/department-manager";
import { BranchManager } from "@/components/settings/branch-manager";

export const metadata = { title: "Settings" };

type Branding = { primaryColor?: string; logoUrl?: string };

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  const [organization, settings, departments, branches] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: membership.organizationId } }),
    findOrganizationSettings(membership.organizationId),
    listDepartmentsWithOpportunityCounts(membership.organizationId),
    listBranchesWithOpportunityCounts(membership.organizationId),
  ]);

  const branding = (settings?.branding as Branding | null) ?? {};

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Organization profile and configuration.</p>
      </div>

      {can(membership, "organization.update") ? (
        <OrganizationProfileForm
          name={organization.name}
          country={organization.country}
          primaryColor={branding.primaryColor ?? ""}
          logoUrl={branding.logoUrl ?? ""}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Organization profile</CardTitle>
            <CardDescription>Contact an Owner or Admin to change these.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Name</Label>
              <Input id="org-name" value={organization.name} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-country">Country</Label>
              <Input id="org-country" value={organization.country} disabled />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Careers page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex gap-2">
            <Input value={`adotkazi.com/careers/${organization.slug}`} disabled />
            <Button
              nativeButton={false}
              variant="outline"
              size="icon"
              render={<Link href={`/careers/${organization.slug}`} target="_blank" />}
            >
              <ExternalLinkIcon />
            </Button>
          </div>
        </CardContent>
      </Card>

      {can(membership, "department.manage") ? (
        <DepartmentManager
          departments={departments.map((department) => ({
            id: department.id,
            name: department.name,
            description: department.description,
            color: department.color,
            opportunityCount: department._count.opportunities,
          }))}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Contact an Owner or Admin to manage these.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {departments.map((department) => (
              <p key={department.id} className="text-sm">
                {department.name}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {can(membership, "branch.manage") ? (
        <BranchManager
          branches={branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            country: branch.country,
            isHeadquarters: branch.isHeadquarters,
            status: branch.status,
            opportunityCount: branch._count.opportunities,
          }))}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>Contact an Owner or Admin to manage these.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {branches.map((branch) => (
              <p key={branch.id} className="text-sm">
                {branch.name}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
