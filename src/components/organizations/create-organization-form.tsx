"use client";

import * as React from "react";
import { useActionState } from "react";

import {
  createOrganizationAction,
  type CreateOrganizationActionState,
} from "@/domains/platform/organizations/organization.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: CreateOrganizationActionState = { error: null };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(createOrganizationAction, initialState);
  const [name, setName] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [slug, setSlug] = React.useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          This becomes your workspace on AdotKazi — you can invite your team afterward.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Adotdevs Limited"
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">adotkazi.com/</span>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="adotdevs"
              />
            </div>
            {state.fieldErrors?.slug && (
              <p className="text-destructive text-sm">{state.fieldErrors.slug}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required placeholder="Tanzania" />
            {state.fieldErrors?.country && (
              <p className="text-destructive text-sm">{state.fieldErrors.country}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              required
              defaultValue="Africa/Dar_es_Salaam"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam (EAT)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
              <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
              <option value="Africa/Kigali">Africa/Kigali (CAT)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Etc/UTC">UTC</option>
            </select>
            {state.fieldErrors?.timezone && (
              <p className="text-destructive text-sm">{state.fieldErrors.timezone}</p>
            )}
          </div>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creating…" : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
