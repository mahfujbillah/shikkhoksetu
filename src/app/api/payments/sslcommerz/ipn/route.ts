import { NextResponse } from "next/server";
import { handleSslcommerzCallback } from "@/server/payments/sslcommerz";

/** Server-to-server Instant Payment Notification from SSLCommerz (the source of truth). */
export async function POST(req: Request) {
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  const result = await handleSslcommerzCallback(form);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
