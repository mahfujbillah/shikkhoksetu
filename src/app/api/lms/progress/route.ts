import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { lmsProgressSchema } from "@/server/validation";
import { ingestLmsProgress } from "@/server/services/engagement";

/**
 * Parent LMS → marketplace: push a student's course performance.
 *   POST /api/lms/progress   Authorization: Bearer <LMS_API_KEY>
 *   { "lmsStudentId": "stu_42", "courseId": "phy-101", "courseTitle": "SSC Physics", "metric": "quiz_avg", "value": 78.5 }
 * Accepts a single object or an array (batch).
 */
export async function POST(req: Request) {
  const key = process.env.LMS_API_KEY;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!key || given.length !== key.length || !timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body) ? body : [body];
  if (items.length > 500) return NextResponse.json({ error: "batch too large" }, { status: 413 });
  let delivered = 0;
  for (const item of items) {
    const parsed = lmsProgressSchema.safeParse(item);
    if (!parsed.success) return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 422 });
    delivered += await ingestLmsProgress(parsed.data);
  }
  return NextResponse.json({ ok: true, delivered });
}
