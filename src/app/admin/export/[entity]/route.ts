import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/auth";
import { DomainError } from "@/server/errors";

export const dynamic = "force-dynamic";
const MAX = 10_000;

/** CSV cell: quote, escape quotes, and neutralise spreadsheet formulas (CSV injection). */
function cell(v: unknown): string {
  if (v == null) return "";
  let s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
const toCsv = (head: string[], rows: unknown[][]) => "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

const pick = <T extends string>(v: string | null, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : undefined);

export async function GET(req: NextRequest, ctx: RouteContext<"/admin/export/[entity]">) {
  try {
    await requireAdmin();
  } catch (e) {
    return new Response(e instanceof DomainError ? e.code : "FORBIDDEN", { status: 403 });
  }
  const { entity } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim().slice(0, 80) || undefined;
  const ci = q ? { contains: q, mode: "insensitive" as const } : undefined;
  let csv: string;

  switch (entity) {
    case "users": {
      const role = pick(sp.get("role"), ["TUTOR", "STUDENT_GUARDIAN", "ADMIN"] as const);
      const rows = await db.user.findMany({ where: { ...(role ? { role } : {}), ...(sp.get("blocked") === "1" ? { isBlocked: true } : {}), ...(ci ? { OR: [{ fullName: ci }, { email: ci }, { phone: { contains: q } }] } : {}) }, orderBy: { createdAt: "desc" }, take: MAX, include: { tutorProfile: true } });
      csv = toCsv(["id", "name", "email", "phone", "role", "super_admin", "blocked", "joined", "university", "verification", "credits", "rating", "completed_tuitions"],
        rows.map((u) => [u.id, u.fullName, u.email, u.phone, u.role, u.isSuperAdmin, u.isBlocked, u.createdAt, u.tutorProfile?.university, u.tutorProfile?.verificationStatus, u.tutorProfile?.creditBalance, u.tutorProfile ? String(u.tutorProfile.ratingAvg) : "", u.tutorProfile?.completedTuitions]));
      break;
    }
    case "tuitions": {
      const status = pick(sp.get("status"), ["OPEN", "SHORTLISTED", "CONFIRMED", "CANCELLED"] as const);
      const rows = await db.tuitionPost.findMany({ where: { ...(status ? { status } : {}), ...(ci ? { OR: [{ title: ci }, { guardian: { fullName: ci } }] } : {}) }, orderBy: { createdAt: "desc" }, take: MAX, include: { guardian: { select: { fullName: true, email: true, phone: true } } } });
      csv = toCsv(["number", "id", "title", "status", "grade", "curriculum", "subjects", "type", "days_per_week", "budget_min", "budget_max", "online", "city", "area", "address", "guardian", "guardian_email", "guardian_phone", "applications", "shortlisted", "created"],
        rows.map((p) => [p.number, p.id, p.title, p.status, p.grade, p.curriculum, p.subjects, p.tuitionType, p.daysPerWeek, p.budgetMin ? String(p.budgetMin) : "", String(p.budgetMax), p.isOnline, p.city, p.area, p.addressLine, p.guardian.fullName, p.guardian.email, p.guardian.phone, p.applicationsCount, p.shortlistedCount, p.createdAt]));
      break;
    }
    case "applications": {
      const status = pick(sp.get("status"), ["PENDING", "SHORTLISTED", "CONFIRMED", "REJECTED", "WITHDRAWN"] as const);
      const rows = await db.tuitionApplication.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: MAX, include: { post: { select: { number: true, title: true } }, tutorProfile: { select: { user: { select: { fullName: true, email: true } } } } } });
      csv = toCsv(["id", "job_number", "job_title", "tutor", "tutor_email", "status", "proposed_salary", "credits_spent", "cover_note", "created"],
        rows.map((a) => [a.id, a.post.number, a.post.title, a.tutorProfile.user.fullName, a.tutorProfile.user.email, a.status, a.proposedSalary ? String(a.proposedSalary) : "", a.creditsSpent, a.coverNote, a.createdAt]));
      break;
    }
    case "agreements": {
      const status = pick(sp.get("status"), ["PENDING_SIGNATURES", "ACTIVE", "COMPLETED", "TERMINATED", "CANCELLED"] as const);
      const rows = await db.tuitionAgreement.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: MAX, include: { guardian: { select: { fullName: true, phone: true } }, tutorProfile: { select: { user: { select: { fullName: true, phone: true } } } }, post: { select: { number: true } } } });
      csv = toCsv(["number", "id", "job_number", "status", "guardian", "guardian_phone", "tutor", "tutor_phone", "monthly_salary", "commission_rate", "commission_amount", "commission_payer", "payment_status", "start_date", "activated", "ended", "end_reason"],
        rows.map((a) => [a.agreementNumber, a.id, a.post.number, a.status, a.guardian.fullName, a.guardian.phone, a.tutorProfile.user.fullName, a.tutorProfile.user.phone, String(a.monthlySalary), String(a.commissionRate), String(a.commissionAmount), a.commissionPayer, a.paymentStatus, a.startDate, a.activatedAt, a.endedAt, a.endReason]));
      break;
    }
    case "invoices": {
      const status = pick(sp.get("status"), ["ISSUED", "OVERDUE", "PAID", "VOID"] as const);
      const rows = await db.invoice.findMany({ where: { ...(status ? { status } : {}), ...(ci ? { OR: [{ invoiceNumber: ci }, { billedTo: { fullName: ci } }] } : {}) }, orderBy: { issuedAt: "desc" }, take: MAX, include: { billedTo: { select: { fullName: true, email: true } } } });
      csv = toCsv(["number", "type", "status", "billed_to", "email", "amount", "currency", "issued", "due", "paid", "notes"],
        rows.map((i) => [i.invoiceNumber, i.type, i.status, i.billedTo.fullName, i.billedTo.email, String(i.amount), i.currency, i.issuedAt, i.dueDate, i.paidAt, i.notes]));
      break;
    }
    case "payments": {
      const provider = pick(sp.get("provider"), ["SSLCOMMERZ", "STRIPE", "MANUAL"] as const);
      const rows = await db.paymentTransaction.findMany({ where: { ...(provider ? { provider } : {}), ...(ci ? { OR: [{ tranId: ci }, { providerRef: ci }] } : {}) }, orderBy: { createdAt: "desc" }, take: MAX, include: { invoice: { select: { invoiceNumber: true, billedTo: { select: { fullName: true } } } } } });
      csv = toCsv(["tran_id", "provider", "provider_ref", "status", "amount", "currency", "invoice", "billed_to", "failure_reason", "created"],
        rows.map((x) => [x.tranId, x.provider, x.providerRef, x.status, String(x.amount), x.currency, x.invoice.invoiceNumber, x.invoice.billedTo.fullName, x.failureReason, x.createdAt]));
      break;
    }
    case "audit": {
      const e = sp.get("entity") || undefined;
      const rows = await db.auditLog.findMany({ where: { ...(e ? { entity: e } : {}), ...(ci ? { OR: [{ action: ci }, { entityId: q }] } : {}) }, orderBy: { createdAt: "desc" }, take: MAX, include: { actor: { select: { fullName: true, email: true } } } });
      csv = toCsv(["time", "actor", "actor_email", "action", "entity", "entity_id", "meta"], rows.map((r) => [r.createdAt, r.actor?.fullName, r.actor?.email, r.action, r.entity, r.entityId, r.meta]));
      break;
    }
    default:
      return new Response("Unknown export", { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shikkhoksetu-${entity}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
