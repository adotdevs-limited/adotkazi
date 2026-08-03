import "server-only";

import { prisma } from "@/lib/db";

export function createNote(data: { applicationId: string; authorMembershipId: string; body: string }) {
  return prisma.applicationNote.create({ data });
}

export function listNotesForApplication(applicationId: string) {
  return prisma.applicationNote.findMany({
    where: { applicationId },
    include: { author: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
}
