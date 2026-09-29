import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { DomainError } from "../errors";
import { settleInvoice } from "../services/billing";
import { transaction } from "../services/common";

/**
 * Stripe Checkout for international cards (diaspora parents). Uses the REST API directly — no SDK.
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL
 */
export const stripeEnabled = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export async function createStripeCheckout(args: { tranId: string; amount: string; currency: string; invoiceNumber: string; email: string }) {
  if (!stripeEnabled()) throw new DomainError("PAYMENT_NOT_CONFIGURED");
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const minor = Math.round(Number(args.amount) * 100);
  const body = new URLSearchParams({
    mode: "payment",
    client_reference_id: args.tranId,
    customer_email: args.email,
    success_url: `${app}/dashboard/invoices?paid=1`,
    cancel_url: `${app}/dashboard/invoices?cancelled=1`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": args.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(minor),
    "line_items[0][price_data][product_data][name]": `ShikkhokSetu ${args.invoiceNumber}`,
    "metadata[tran_id]": args.tranId,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Idempotency-Key": args.tranId },
    body,
    cache: "no-store",
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message: string } };
  if (!res.ok || !json.url) throw new DomainError("PAYMENT_FAILED", json.error?.message);
  await db.paymentTransaction.update({ where: { tranId: args.tranId }, data: { providerRef: json.id } });
  return json.url;
}

/** Verifies the `Stripe-Signature` header (HMAC-SHA256 over "<t>.<raw body>", 5-minute tolerance). */
export function verifyStripeSignature(rawBody: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET!) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const given = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

export async function handleStripeEvent(event: { type: string; data: { object: { client_reference_id?: string; payment_status?: string; amount_total?: number; currency?: string; id: string } } }) {
  if (event.type !== "checkout.session.completed") return;
  const s = event.data.object;
  if (s.payment_status !== "paid" || !s.client_reference_id) return;
  const txn = await db.paymentTransaction.findUnique({ where: { tranId: s.client_reference_id } });
  if (!txn || txn.status === "SUCCESS") return;
  if (s.amount_total !== Math.round(Number(txn.amount) * 100) || s.currency?.toUpperCase() !== txn.currency) {
    await db.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", failureReason: "amount/currency mismatch", rawPayload: s } });
    return;
  }
  await transaction(async (tx) => {
    await tx.paymentTransaction.update({ where: { id: txn.id }, data: { providerRef: s.id, rawPayload: s } });
    await settleInvoice(tx, txn.invoiceId, txn.id);
  });
}
