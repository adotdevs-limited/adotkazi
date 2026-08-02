import Link from "next/link";
import { BriefcaseIcon, MapPinIcon } from "lucide-react";

import type { Opportunity, Department } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function OpportunityCard({
  organizationSlug,
  opportunity,
}: {
  organizationSlug: string;
  opportunity: Opportunity & { department: Department };
}) {
  return (
    <Link href={`/careers/${organizationSlug}/${opportunity.slug}`}>
      <Card className="hover:ring-foreground/20 transition-colors">
        <CardContent className="grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-medium">{opportunity.title}</h2>
            <Badge variant="outline">{opportunity.opportunityType.replaceAll("_", " ")}</Badge>
          </div>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1">
              <BriefcaseIcon className="size-3.5" />
              {opportunity.department.name}
            </span>
            <span className="flex items-center gap-1">
              <MapPinIcon className="size-3.5" />
              {opportunity.location ?? opportunity.workplaceType.replaceAll("_", " ")}
            </span>
            {opportunity.applicationDeadline && (
              <span>Apply by {opportunity.applicationDeadline.toLocaleDateString()}</span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
