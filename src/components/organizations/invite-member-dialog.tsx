"use client";

import * as React from "react";
import { useActionState } from "react";
import { PlusIcon } from "lucide-react";

import {
  inviteMemberAction,
  type InviteMemberActionState,
} from "@/domains/platform/memberships/membership.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: InviteMemberActionState = { error: null };

export function InviteMemberDialog({ roles }: { roles: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, isPending] = useActionState(inviteMemberAction, initialState);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <PlusIcon /> Invite member
          </Button>
        }
      />
      <DialogContent>
        {state.inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created</DialogTitle>
              <DialogDescription>
                Email delivery isn&apos;t wired up yet — share this link with your teammate
                directly.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted rounded-lg border p-3 text-sm break-all">
              {state.inviteLink}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(state.inviteLink!);
                }}
              >
                Copy link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form action={formAction} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Invite a member</DialogTitle>
              <DialogDescription>
                They&apos;ll be able to join once they accept the invitation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" required autoFocus />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="roleId"
                required
                defaultValue={roles[0]?.id}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {state.error && <p className="text-destructive text-sm">{state.error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
