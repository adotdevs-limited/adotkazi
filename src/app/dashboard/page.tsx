import Link from "next/link";
import { BriefcaseIcon, UsersIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{membership.organizationName}</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {user.name.split(" ")[0]}. Here&apos;s what&apos;s happening.
        </p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-full">
            <BriefcaseIcon className="text-muted-foreground size-6" />
          </div>
          <CardTitle>No opportunities yet</CardTitle>
          <CardDescription>
            Recruitment and the Opportunity Engine ship in the next milestone. Once available,
            published roles and applications will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/members" />}
          >
            <UsersIcon /> Invite your team instead
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
