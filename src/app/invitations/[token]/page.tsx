import Link from "next/link";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { findInvitationByToken } from "@/domains/platform/memberships/membership.repository";
import { acceptInvitationAction } from "@/domains/platform/memberships/accept-invitation.action";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Accept invitation" };

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await findInvitationByToken(token);
  const user = await getCurrentUser();

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return (
      <Centered>
        <Card>
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Ask the person who invited you to send
              a new one.
            </CardDescription>
          </CardHeader>
        </Card>
      </Centered>
    );
  }

  if (!user) {
    return (
      <Centered>
        <Card>
          <CardHeader>
            <CardTitle>Join {invitation.organization.name}</CardTitle>
            <CardDescription>
              Sign in or create an account with {invitation.email} to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/sign-in" />}>
              Sign in
            </Button>
            <Button nativeButton={false} variant="outline" render={<Link href="/sign-up" />}>
              Create account
            </Button>
          </CardFooter>
        </Card>
      </Centered>
    );
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Centered>
        <Card>
          <CardHeader>
            <CardTitle>Wrong account</CardTitle>
            <CardDescription>
              This invitation was sent to {invitation.email}, but you&apos;re signed in as{" "}
              {user.email}. Sign out and try again with the invited email address.
            </CardDescription>
          </CardHeader>
        </Card>
      </Centered>
    );
  }

  async function accept() {
    "use server";
    await acceptInvitationAction(token);
  }

  return (
    <Centered>
      <Card>
        <CardHeader>
          <CardTitle>Join {invitation.organization.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as {invitation.role.name}. Accept to get started.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <form action={accept}>
            <Button type="submit">Accept invitation</Button>
          </form>
        </CardFooter>
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
