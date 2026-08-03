import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { getOfferForCandidate } from "@/domains/recruitment/offers/offer.service";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferStatusBadge } from "@/components/applications/offer-status-badge";
import { OfferResponseActions } from "@/components/applications/offer-response-actions";

export const metadata = { title: "Your Offer" };

export default async function OfferPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/applications/${applicationId}/offer`)}`);
  }

  let result: Awaited<ReturnType<typeof getOfferForCandidate>>;
  try {
    result = await getOfferForCandidate(user, applicationId);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { application, offer } = result;
  if (!offer) {
    notFound();
  }

  const isExpired = offer.status === "SENT" && Boolean(offer.expiresAt && offer.expiresAt < new Date());
  const canRespond = offer.status === "SENT" && !isExpired;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
      <Link
        href="/applications"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> My Applications
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{application.opportunity.title}</h1>
        <p className="text-muted-foreground text-sm">{application.opportunity.organization.name}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Offer</CardTitle>
          <OfferStatusBadge status={isExpired ? "EXPIRED" : offer.status} />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {offer.salary && (
              <Field label="Salary" value={`${offer.salary} ${offer.currency ?? ""}`.trim()} />
            )}
            {offer.startDate && (
              <Field label="Start date" value={offer.startDate.toLocaleDateString()} />
            )}
            {offer.expiresAt && (
              <Field label="Respond by" value={offer.expiresAt.toLocaleDateString()} />
            )}
          </div>

          {canRespond && <OfferResponseActions offerId={offer.id} />}
          {isExpired && (
            <p className="text-muted-foreground text-sm">
              This offer has expired. Contact the organization if you&apos;re still interested.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
