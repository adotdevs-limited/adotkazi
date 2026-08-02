"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
  type DepartmentActionState,
  type DepartmentLifecycleState,
} from "@/domains/platform/departments/department.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  opportunityCount: number;
};

function DepartmentForm({
  department,
  onDone,
}: {
  department?: DepartmentRow;
  onDone?: () => void;
}) {
  const initialState: DepartmentActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    department ? updateDepartmentAction : createDepartmentAction,
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

  const domId = department?.id ?? "new";

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-lg border p-3">
      {department && <input type="hidden" name="id" value={department.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor={`dept-name-${domId}`}>Name</Label>
          <Input
            id={`dept-name-${domId}`}
            name="name"
            required
            defaultValue={department?.name}
            placeholder="Engineering"
          />
          {state.fieldErrors?.name && (
            <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`dept-color-${domId}`}>Color</Label>
          <input
            id={`dept-color-${domId}`}
            name="color"
            type="color"
            defaultValue={department?.color ?? "#6366f1"}
            className="h-8 w-16 rounded-lg border p-1"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`dept-description-${domId}`}>Description</Label>
        <Input
          id={`dept-description-${domId}`}
          name="description"
          defaultValue={department?.description ?? ""}
          placeholder="What this department covers."
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : department ? "Save department" : "Add department"}
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

function DepartmentItem({ department }: { department: DepartmentRow }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  if (isEditing) {
    return <DepartmentForm department={department} onDone={() => setIsEditing(false)} />;
  }

  const deleteBlockedReason =
    department.opportunityCount > 0
      ? `${department.opportunityCount} opportunity(s) use this department.`
      : undefined;

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <span
        className="size-3 shrink-0 rounded-full border"
        style={{ backgroundColor: department.color ?? "transparent" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{department.name}</p>
        {department.description && (
          <p className="text-muted-foreground truncate text-xs">{department.description}</p>
        )}
      </div>
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
            if (!window.confirm(`Delete the "${department.name}" department?`)) return;
            startTransition(async () => {
              const result: DepartmentLifecycleState = await deleteDepartmentAction(department.id);
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

export function DepartmentManager({ departments }: { departments: DepartmentRow[] }) {
  const [showAddForm, setShowAddForm] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Used to organize opportunities across your organization.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {departments.length === 0 && (
          <p className="text-muted-foreground py-2 text-sm">No departments yet.</p>
        )}
        {departments.map((department) => (
          <DepartmentItem key={department.id} department={department} />
        ))}

        {showAddForm ? (
          <DepartmentForm onDone={() => setShowAddForm(false)} />
        ) : (
          <Button variant="outline" className="w-fit" onClick={() => setShowAddForm(true)}>
            <PlusIcon /> Add department
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
