import "server-only";
import { db } from "@/lib/db";
import { DomainError } from "../errors";
import { settleInvoice } from "../services/billing";
import { transaction } from "../services/common";

/**
 * SSLCommerz — Bangladesh's largest gateway. One integration covers cards, bKash, Nagad, Rocket,
 * Upay and internet banking. Docs: https://developer.sslcommerz.com/doc/v4/
 *
 * Env: SSLCZ_STORE_ID, SSLCZ_STORE_PASSWD, SSLCZ_SANDBOX ("true" for sandbox), APP_URL
 */
const base = () => (process.env.SSLCZ_SANDBOX === "false" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com");
export const sslcommerzEnabled = () => !!(process.env.SSLCZ_STORE_ID && process.env.SSLCZ_STORE_PASSWD);

export async function createSslcommerzSession(args: { tranId: string; amount: string; currency: string; invoiceNumber: string; customer: { name: string; email: string; phone?: string | null } }) {
  if (!sslcommerzEnabled()) throw new DomainError("PAYMENT_NOT_CONFIGURED");
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const body = new URLSearchParams({
    store_id: process.env.SSLCZ_STORE_ID!,
    store_passwd: process.env.SSLCZ_STORE_PASSWD!,
    total_amount: args.amount,
    currency: args.currency,
    tran_id: args.tranId,
    success_url: `${app}/api/payments/sslcommerz/return?result=success`,
    fail_url: `${app}/api/payments/sslcommerz/return?result=fail`,
    cancel_url: `${app}/api/payments/sslcommerz/return?result=cancel`,
    ipn_url: `${app}/api/payments/sslcommerz/ipn`,
    product_name: `ShikkhokSetu ${args.invoiceNumber}`,
    product_category: "Education",
    product_profile: "non-physical-goods",
    shipping_method: "NO",
    cus_name: args.customer.name,
    cus_email: args.customer.email,
    cus_phone: args.customer.phone || "01700000000",
    cus_add1: "Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    value_a: args.invoiceNumber,
  });
  const res = await fetch(`${base()}/gwprocess/v4/api.php`, { method: "POST", body, cache: "no-store" });
  const json = (await res.json()) as { status?: string; GatewayPageURL?: string; failedreason?: string; sessionkey?: string };
  if (json.status !== "SUCCESS" || !json.GatewayPageURL) throw new DomainError("PAYMENT_FAILED", json.failedreason ?? "Gateway rejected the session");
  await db.paymentTransaction.update({ where: { tranId: args.tranId }, data: { providerRef: json.sessionkey } });
  return json.GatewayPageURL;
}

type Validation = { status: string; tran_id: string; amount: string; currency: string; val_id: string; bank_tran_id?: string; card_type?: string; risk_level?: string };

/**
 * Handles both the browser return (success_url) and the server-to-server IPN.
 * Never trusts the POSTed fields: re-validates with SSLCommerz' Validation API, checks the tran_id,
 * amount and currency against OUR transaction, then settles idempotently.
 */
export async function handleSslcommerzCallback(form: Record<string, string>): Promise<{ ok: boolean; invoiceId?: string; reason?: string }> {
  const tranId = form.tran_id;
  const valId = form.val_id;
  if (!tranId) return { ok: false, reason: "missing tran_id" };
  const txn = await db.paymentTransaction.findUnique({ where: { tranId } });
  if (!txn || txn.provider !== "SSLCOMMERZ") return { ok: false, reason: "unknown transaction" };
  if (txn.status === "SUCCESS") return { ok: true, invoiceId: txn.invoiceId }; // replay

  if (form.status && form.status !== "VALID" && form.status !== "VALIDATED") {
    await db.paymentTransaction.updateMany({ where: { id: txn.id, status: "INITIATED" }, data: { status: form.status === "CANCELLED" ? "CANCELLED" : "FAILED", failureReason: form.error ?? form.status, rawPayload: form } });
    return { ok: false, invoiceId: txn.invoiceId, reason: form.status };
  }
  if (!valId) return { ok: false, invoiceId: txn.invoiceId, reason: "missing val_id" };

  const q = new URLSearchParams({ val_id: valId, store_id: process.env.SSLCZ_STORE_ID!, store_passwd: process.env.SSLCZ_STORE_PASSWD!, format: "json", v: "1" });
  const res = await fetch(`${base()}/validator/api/validationserverAPI.php?${q}`, { cache: "no-store" });
  const v = (await res.json()) as Validation;

  const amountOk = Number(v.amount).toFixed(2) === Number(txn.amount).toFixed(2);
  const valid = (v.status === "VALID" || v.status === "VALIDATED") && v.tran_id === tranId && amountOk && v.currency === txn.currency && v.risk_level !== "1";
  if (!valid) {
    await db.paymentTransaction.updateMany({ where: { id: txn.id, status: "INITIATED" }, data: { status: "FAILED", failureReason: `validation: ${v.status}${amountOk ? "" : " amount mismatch"}${v.risk_level === "1" ? " high risk" : ""}`, rawPayload: v } });
    return { ok: false, invoiceId: txn.invoiceId, reason: "validation failed" };
  }

  await transaction(async (tx) => {
    await tx.paymentTransaction.update({ where: { id: txn.id }, data: { providerRef: v.bank_tran_id ?? v.val_id, rawPayload: v } });
    await settleInvoice(tx, txn.invoiceId, txn.id);
  });
  return { ok: true, invoiceId: txn.invoiceId };
}
