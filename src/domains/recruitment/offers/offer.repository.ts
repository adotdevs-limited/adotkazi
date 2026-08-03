import "server-only";

import type { OfferStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type CreateOfferData = {
  applicationId: string;
  salary?: number;
  currency?: string;
  startDate?: Date;
  expiresAt?: Date;
};

export function createOffer(data: CreateOfferData) {
  return prisma.offer.create({ data });
}

export function findActiveOfferForApplication(applicationId: string) {
  return prisma.offer.findFirst({
    where: { applicationId, status: "SENT" },
    orderBy: { createdAt: "desc" },
  });
}

export function listOffersForApplication(applicationId: string) {
  return prisma.offer.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });
}

export function findOfferById(id: string) {
  return prisma.offer.findUnique({
    where: { id },
    include: {
      application: {
        select: {
          id: true,
          organizationId: true,
          status: true,
          candidate: { select: { userId: true } },
          opportunity: { select: { title: true, organization: { select: { name: true } } } },
        },
      },
    },
  });
}

export function updateOfferStatus(
  id: string,
  status: OfferStatus,
  timestamp: { acceptedAt?: Date; declinedAt?: Date; withdrawnAt?: Date },
) {
  return prisma.offer.update({ where: { id }, data: { status, ...timestamp } });
}
