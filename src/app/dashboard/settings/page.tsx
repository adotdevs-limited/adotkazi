import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: membership.organizationId },
  });

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Organization profile and configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>
            Editing organization details, branding, branches, and departments lands in the next
            milestone.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" value={organization.name} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-slug">Workspace URL</Label>
            <Input id="org-slug" value={`adotkazi.com/${organization.slug}`} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-country">Country</Label>
            <Input id="org-country" value={organization.country} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
