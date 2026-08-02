"use client";

import { useActionState } from "react";

import {
  updateOrganizationProfileAction,
  type UpdateOrganizationProfileActionState,
} from "@/domains/platform/organizations/organization.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: UpdateOrganizationProfileActionState = { error: null };

export function OrganizationProfileForm({
  name,
  country,
  primaryColor,
  logoUrl,
}: {
  name: string;
  country: string;
  primaryColor: string;
  logoUrl: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateOrganizationProfileAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>Name, country, and branding shown across AdotKazi.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={name} />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required defaultValue={country} />
            {state.fieldErrors?.country && (
              <p className="text-destructive text-sm">{state.fieldErrors.country}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Brand color</Label>
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={primaryColor || "#6366f1"}
                className="h-8 w-16 rounded-lg border p-1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                defaultValue={logoUrl}
                placeholder="https://example.com/logo.png"
              />
              {state.fieldErrors?.logoUrl && (
                <p className="text-destructive text-sm">{state.fieldErrors.logoUrl}</p>
              )}
            </div>
          </div>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
