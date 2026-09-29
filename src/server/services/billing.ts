import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceType, PaymentProvider } from "@/generated/prisma/enums";
import type { SessionUser } from "../auth";
import { DomainError } from "../errors";
import { audit, D, getSettings, lockRow, notify, transaction, type Tx } from "./common";

export async function nextInvoiceNumber(tx: Tx) {
  const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('invoice_number_seq') AS n`;
  return `INV-${new Date().getFullYear()}-${String(n).padStart(6, "0")}`;
}

export async function createInvoice(
  tx: Tx,
  args: { type: InvoiceType; billedToId: string; amount: number; lineItems: { label: string; amount: number }[]; agreementId?: string; trialSessionId?: string; creditsGranted?: number; notes?: string },
) {
  const settings = await getSettings(tx);
  const invoice = await tx.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(tx),
      type: args.type,
      billedToId: args.billedToId,
      amount: D(args.amount),
      lineItems: args.lineItems,
      agreementId: args.agreementId,
      trialSessionId: args.trialSessionId,
      creditsGranted: args.creditsGranted,
      notes: args.notes,
      dueDate: new Date(Date.now() + settings.invoiceDueDays * 86_400_000),
    },
  });
  await notify(tx, args.billedToId, "INVOICE_ISSUED", `Invoice ${invoice.invoiceNumber} issued`, `Amount due: ৳${args.amount}`, "/dashboard/invoices");
  return invoice;
}

/**
 * Mark an invoice paid exactly once (webhooks may retry; users may double-submit).
 * The conditional update (status IN ISSUED/OVERDUE) makes this idempotent under concurrency,
 * and side effects (agreement payment status, credit top-up) run only for the winning call.
 */
export async function settleInvoice(tx: Tx, invoiceId: string, transactionId: string) {
  const res = await tx.invoice.updateMany({ where: { id: invoiceId, status: { in: ["ISSUED", "OVERDUE"] } }, data: { status: "PAID", paidAt: new Date() } });
  await tx.paymentTransaction.update({ where: { id: transactionId }, data: { status: "SUCCESS" } });
  if (res.count !== 1) return false; // already settled

  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (inv.type === "PLATFORM_COMMISSION" && inv.agreementId) {
    await tx.tuitionAgreement.update({ where: { id: inv.agreementId }, data: { paymentStatus: "PAID" } });
  }
  if (inv.type === "CREDIT_PACK" && inv.creditsGranted) {
    const profile = await tx.tutorProfile.findUnique({ where: { userId: inv.billedToId } });
    if (profile) {
      await tx.tutorProfile.update({ where: { id: profile.id }, data: { creditBalance: { increment: inv.creditsGranted } } });
      await tx.creditLedger.create({ data: { tutorProfileId: profile.id, delta: inv.creditsGranted, reason: `PURCHASE:${inv.id}` } });
    }
  }
  await notify(tx, inv.billedToId, "INVOICE_PAID", `Payment received for ${inv.invoiceNumber}`, undefined, "/dashboard/invoices");
  return true;
}

/** Creates a pending gateway transaction for the invoice owner. */
export async function startPayment(user: SessionUser, invoiceId: string, provider: Exclude<PaymentProvider, "MANUAL">) {
  return transaction(async (tx) => {
    await lockRow(tx, "invoices", invoiceId);
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new DomainError("NOT_FOUND");
    if (inv.billedToId !== user.id) throw new DomainError("FORBIDDEN");
    if (inv.status !== "ISSUED" && inv.status !== "OVERDUE") throw new DomainError("INVALID_STATE");
    const tranId = `SS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const txn = await tx.paymentTransaction.create({ data: { invoiceId, provider, tranId, amount: inv.amount, currency: inv.currency } });
    return { invoice: inv, txn };
  });
}

/** Admin records an offline payment (cash / bank / direct bKash). */
export async function recordManualPayment(admin: SessionUser, invoiceId: string, reference: string) {
  return transaction(async (tx) => {
    await lockRow(tx, "invoices", invoiceId);
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new DomainError("NOT_FOUND");
    if (inv.status !== "ISSUED" && inv.status !== "OVERDUE") throw new DomainError("INVALID_STATE");
    const txn = await tx.paymentTransaction.create({
      data: { invoiceId, provider: "MANUAL", tranId: `MAN-${inv.invoiceNumber}-${Date.now()}`, providerRef: reference, amount: inv.amount, currency: inv.currency, recordedById: admin.id },
    });
    await settleInvoice(tx, invoiceId, txn.id);
    await audit(tx, admin.id, "INVOICE_MARK_PAID", "Invoice", invoiceId, { reference });
  });
}

export async function voidInvoice(admin: SessionUser, invoiceId: string, reason: string) {
  return transaction(async (tx) => {
    const res = await tx.invoice.updateMany({ where: { id: invoiceId, status: { in: ["ISSUED", "OVERDUE"] } }, data: { status: "VOID", notes: reason } });
    if (res.count !== 1) throw new DomainError("INVALID_STATE");
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.type === "PLATFORM_COMMISSION" && inv.agreementId) await tx.tuitionAgreement.update({ where: { id: inv.agreementId }, data: { paymentStatus: "WAIVED" } });
    await audit(tx, admin.id, "INVOICE_VOID", "Invoice", invoiceId, { reason });
  });
}

/** Tutor buys a credit pack (CREDITS / HYBRID monetisation). */
export async function createCreditPackInvoice(user: SessionUser, pack: { credits: number; price: number }) {
  if (user.role !== "TUTOR") throw new DomainError("FORBIDDEN");
  return transaction((tx) =>
    createInvoice(tx, { type: "CREDIT_PACK", billedToId: user.id, amount: pack.price, creditsGranted: pack.credits, lineItems: [{ label: `${pack.credits} application credits`, amount: pack.price }] }),
  );
}

/** Flip ISSUED invoices past their due date to OVERDUE (call from a cron or on dashboard load). */
export function markOverdueInvoices() {
  return db.invoice.updateMany({ where: { status: "ISSUED", dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } });
}

export function listMyInvoices(userId: string) {
  return db.invoice.findMany({ where: { billedToId: userId }, orderBy: { issuedAt: "desc" }, include: { agreement: { select: { agreementNumber: true } } } });
}

export const CREDIT_PACKS = [
  { credits: 10, price: 300 },
  { credits: 30, price: 750 },
  { credits: 100, price: 2000 },
];

export type LineItems = Prisma.JsonArray;
