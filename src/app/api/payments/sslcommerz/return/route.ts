import { NextResponse } from "next/server";
import { handleSslcommerzCallback } from "@/server/payments/sslcommerz";

/** The customer's browser is POSTed back here; we validate too (IPN may arrive later) and redirect. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  const r = url.searchParams.get("result") === "success" ? await handleSslcommerzCallback(form) : await handleSslcommerzCallback({ ...form, status: form.status ?? "FAILED" });
  const dest = new URL(`/dashboard/invoices?${r.ok ? "paid=1" : "failed=1"}`, process.env.APP_URL ?? url.origin);
  return NextResponse.redirect(dest, 303);
}
