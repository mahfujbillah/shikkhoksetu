import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

/** Interactive transaction with sane defaults for a serverless + pgbouncer setup. */
export function transaction<T>(fn: (tx: Tx) => Promise<T>) {
  return db.$transaction(fn, { maxWait: 5_000, timeout: 15_000 });
}

/**
 * Pessimistic row lock (SELECT … FOR UPDATE) inside a transaction.
 * Serialises concurrent writers on the same job/agreement so counters and caps stay correct.
 */
export async function lockRow(tx: Tx, table: "tuition_posts" | "tuition_agreements" | "invoices" | "tutor_profiles", id: string) {
  const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "${table}" WHERE "id" = $1 FOR UPDATE`, id);
  return rows.length === 1;
}

export async function getSettings(tx: Tx | typeof db = db) {
  return (
    (await tx.platformSetting.findUnique({ where: { id: 1 } })) ??
    (await tx.platformSetting.create({ data: { id: 1 } }))
  );
}

export async function notify(tx: Tx, userId: string, type: string, title: string, body?: string, link?: string) {
  await tx.notification.create({ data: { userId, type, title, body, link } });
}

export async function audit(tx: Tx, actorId: string | null, action: string, entity: string, entityId: string, meta?: Prisma.InputJsonValue) {
  await tx.auditLog.create({ data: { actorId, action, entity, entityId, meta } });
}

export const D = (n: number | string) => new Prisma.Decimal(n);
