import { NextResponse } from "next/server";
import { handleStripeEvent, verifyStripeSignature } from "@/server/payments/stripe";

export async function POST(req: Request) {
  const raw = await req.text(); // raw body is required for signature verification
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  await handleStripeEvent(JSON.parse(raw));
  return NextResponse.json({ received: true });
}
