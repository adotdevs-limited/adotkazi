"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import { switchActiveOrganization } from "@/domains/platform/tenancy/switch-organization.action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OrgSwitcherOption = {
  organizationId: string;
  name: string;
  roleName: string;
};

export function OrgSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrgSwitcherOption[];
  activeOrganizationId: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const active = organizations.find((o) => o.organizationId === activeOrganizationId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="w-full justify-between" disabled={isPending}>
            <span className="truncate">{active?.name ?? "Select organization"}</span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organizationId}
            onClick={() => {
              if (org.organizationId === activeOrganizationId) return;
              startTransition(() => {
                void switchActiveOrganization(org.organizationId);
              });
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{org.name}</span>
              <span className="text-muted-foreground text-xs">{org.roleName}</span>
            </div>
            {org.organizationId === activeOrganizationId && <CheckIcon className="shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/onboarding/organization" />}>
          <PlusIcon /> Create organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
