import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import {
  listAssignableRoles,
  listMembers,
} from "@/domains/platform/memberships/membership.repository";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/organizations/invite-member-dialog";

export const metadata = { title: "Members" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  INVITED: "secondary",
  SUSPENDED: "destructive",
  REMOVED: "destructive",
};

export default async function MembersPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  const [members, roles] = await Promise.all([
    listMembers(membership.organizationId),
    listAssignableRoles(membership.organizationId),
  ]);

  const canInvite = can(membership, "membership.invite");

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-muted-foreground text-sm">
            People with access to {membership.organizationName}.
          </p>
        </div>
        {canInvite && <InviteMemberDialog roles={roles.map((r) => ({ id: r.id, name: r.name }))} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {members.length} {members.length === 1 ? "member" : "members"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Avatar className="size-8">
                {member.user.image && (
                  <AvatarImage src={member.user.image} alt={member.user.name} />
                )}
                <AvatarFallback>{member.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{member.user.email}</p>
              </div>
              <span className="text-muted-foreground text-sm">{member.role.name}</span>
              <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"}>
                {member.status.toLowerCase()}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
