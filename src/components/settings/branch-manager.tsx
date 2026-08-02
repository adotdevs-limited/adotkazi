"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createBranchAction,
  deleteBranchAction,
  updateBranchAction,
  type BranchActionState,
  type BranchLifecycleState,
} from "@/domains/platform/branches/branch.actions";
import { BRANCH_STATUS_OPTIONS } from "@/domains/platform/branches/branch.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

export type BranchRow = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  isHeadquarters: boolean;
  status: "ACTIVE" | "INACTIVE";
  opportunityCount: number;
};

function BranchForm({ branch, onDone }: { branch?: BranchRow; onDone?: () => void }) {
  const initialState: BranchActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    branch ? updateBranchAction : createBranchAction,
    initialState,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const onDoneRef = React.useRef(onDone);

  React.useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  React.useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onDoneRef.current?.();
    }
  }, [state.success]);

  const domId = branch?.id ?? "new";

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-lg border p-3">
      {branch && <input type="hidden" name="id" value={branch.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`branch-name-${domId}`}>Name</Label>
          <Input
            id={`branch-name-${domId}`}
            name="name"
            required
            defaultValue={branch?.name}
            placeholder="Dar es Salaam HQ"
          />
          {state.fieldErrors?.name && (
            <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`branch-code-${domId}`}>Code</Label>
          <Input id={`branch-code-${domId}`} name="code" defaultValue={branch?.code ?? ""} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`branch-city-${domId}`}>City</Label>
          <Input id={`branch-city-${domId}`} name="city" defaultValue={branch?.city ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`branch-country-${domId}`}>Country</Label>
          <Input
            id={`branch-country-${domId}`}
            name="country"
            defaultValue={branch?.country ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`branch-address-${domId}`}>Address</Label>
        <Input
          id={`branch-address-${domId}`}
          name="address"
          defaultValue={branch?.address ?? ""}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`branch-status-${domId}`}>Status</Label>
          <select
            id={`branch-status-${domId}`}
            name="status"
            defaultValue={branch?.status ?? "ACTIVE"}
            className={SELECT_CLASS}
          >
            {BRANCH_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "ACTIVE" ? "Active" : "Inactive"}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isHeadquarters"
            defaultChecked={branch?.isHeadquarters ?? false}
          />
          Headquarters
        </label>
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : branch ? "Save branch" : "Add branch"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function BranchItem({ branch }: { branch: BranchRow }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  if (isEditing) {
    return <BranchForm branch={branch} onDone={() => setIsEditing(false)} />;
  }

  const deleteBlockedReason =
    branch.opportunityCount > 0
      ? `${branch.opportunityCount} opportunity(s) use this branch.`
      : undefined;
  const location = [branch.city, branch.country].filter(Boolean).join(", ");

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{branch.name}</p>
        {location && <p className="text-muted-foreground truncate text-xs">{location}</p>}
      </div>
      {branch.isHeadquarters && <Badge variant="secondary">HQ</Badge>}
      {branch.status === "INACTIVE" && <Badge variant="outline">Inactive</Badge>}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={isPending} onClick={() => setIsEditing(true)}>
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending || Boolean(deleteBlockedReason)}
          title={deleteBlockedReason}
          onClick={() => {
            if (!window.confirm(`Delete the "${branch.name}" branch?`)) return;
            startTransition(async () => {
              const result: BranchLifecycleState = await deleteBranchAction(branch.id);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

export function BranchManager({ branches }: { branches: BranchRow[] }) {
  const [showAddForm, setShowAddForm] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
        <CardDescription>Physical or operational offices for this organization.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {branches.length === 0 && (
          <p className="text-muted-foreground py-2 text-sm">No branches yet.</p>
        )}
        {branches.map((branch) => (
          <BranchItem key={branch.id} branch={branch} />
        ))}

        {showAddForm ? (
          <BranchForm onDone={() => setShowAddForm(false)} />
        ) : (
          <Button variant="outline" className="w-fit" onClick={() => setShowAddForm(true)}>
            <PlusIcon /> Add branch
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
