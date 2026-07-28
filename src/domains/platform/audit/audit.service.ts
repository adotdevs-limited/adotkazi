import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type RecordAuditEventInput = {
  organizationId: string | null;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

/**
 * Records an immutable audit event. See ADMIN_ENTITIES.txt#AuditEvent —
 * audit events are never updated or soft deleted, so this is intentionally
 * the only write operation exposed for this entity.
 *
 * Accepts an optional transaction client (`tx`) so the audit event commits
 * atomically with the business change it documents.
 */
export async function recordAuditEvent(
  input: RecordAuditEventInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeData: input.before,
      afterData: input.after,
    },
  });
}
