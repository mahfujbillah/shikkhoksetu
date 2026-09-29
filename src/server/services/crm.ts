import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus, UserRole } from "@/generated/prisma/enums";
import type { SessionUser } from "../auth";
import { DomainError } from "../errors";
import { audit, D, lockRow, notify, transaction } from "./common";

/**
 * Admin CRM service — "see everything, control everything".
 * Every write re-checks admin rights, runs in a transaction and leaves an audit trail.
 * Admin notes are stored as AuditLog rows (action ADMIN_NOTE) so no extra table is needed.
 */

function assertAdmin(a: SessionUser, superOnly = false) {
  if (a.role !== "ADMIN" || a.isBlocked) throw new DomainError("FORBIDDEN");
  if (superOnly && !a.isSuperAdmin) throw new DomainError("FORBIDDEN");
}

// ───────────────────────── Dashboard ─────────────────────────

export type DayPoint = { day: string; users: number; posts: number; revenue: number };

export async function crmDashboard(days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const [signups, posts, revenue, recent, attention] = await Promise.all([
    db.$queryRaw<{ d: string; n: bigint }[]>`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM-DD') d, count(*) n FROM "users" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ d: string; n: bigint }[]>`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM-DD') d, count(*) n FROM "tuition_posts" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ d: string; n: string }[]>`SELECT to_char(date_trunc('day', "paidAt" AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM-DD') d, sum("amount")::text n FROM "invoices" WHERE "status" = 'PAID' AND "paidAt" >= ${since} GROUP BY 1`,
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { fullName: true } } } }),
    Promise.all([
      db.tutorProfile.count({ where: { verificationStatus: "PENDING" } }),
      db.invoice.count({ where: { status: "OVERDUE" } }),
      db.tuitionAgreement.count({ where: { status: "PENDING_SIGNATURES" } }),
      db.tuitionPost.count({ where: { status: "OPEN", applicationsCount: 0, createdAt: { lt: new Date(Date.now() - 3 * 86400_000) } } }),
      db.user.count({ where: { isBlocked: true } }),
    ]),
  ]);
  const map = (rows: { d: string; n: bigint | string }[]) => new Map(rows.map((r) => [r.d, Number(r.n)]));
  const su = map(signups), po = map(posts), rv = map(revenue);
  const series: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(Date.now() - i * 86400_000));
    series.push({ day, users: su.get(day) ?? 0, posts: po.get(day) ?? 0, revenue: rv.get(day) ?? 0 });
  }
  const [pendingKyc, overdue, awaitingSign, staleJobs, blocked] = attention;
  return { series, recent, attention: { pendingKyc, overdue, awaitingSign, staleJobs, blocked } };
}

// ───────────────────────── Global search ─────────────────────────

export async function globalSearch(qRaw: string) {
  const q = qRaw.trim().slice(0, 80);
  if (!q) return null;
  const num = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;
  const ci = { contains: q, mode: "insensitive" as const };
  const [users, posts, agreements, invoices, transactions] = await Promise.all([
    db.user.findMany({ where: { OR: [{ fullName: ci }, { email: ci }, { phone: { contains: q } }, { id: /^[0-9a-f-]{36}$/i.test(q) ? q : undefined }] }, take: 20, include: { tutorProfile: { select: { university: true, verificationStatus: true } } } }),
    db.tuitionPost.findMany({ where: { OR: [{ title: ci }, { studentName: ci }, { requirements: ci }, ...(num ? [{ number: num }] : [])] }, take: 20, include: { guardian: { select: { fullName: true } } } }),
    db.tuitionAgreement.findMany({ where: num ? { agreementNumber: num } : { OR: [{ guardian: { fullName: ci } }, { tutorProfile: { user: { fullName: ci } } }] }, take: 20, include: { guardian: { select: { fullName: true } }, tutorProfile: { select: { user: { select: { fullName: true } } } } } }),
    db.invoice.findMany({ where: { OR: [{ invoiceNumber: ci }, { billedTo: { fullName: ci } }] }, take: 20, include: { billedTo: { select: { fullName: true } } } }),
    db.paymentTransaction.findMany({ where: { OR: [{ tranId: ci }, { providerRef: ci }] }, take: 10 }),
  ]);
  return { users, posts, agreements, invoices, transactions };
}

// ───────────────────────── Users ─────────────────────────

export async function getUser360(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      tutorProfile: {
        include: {
          kycDocuments: { orderBy: { createdAt: "desc" } },
          applications: { orderBy: { createdAt: "desc" }, take: 50, include: { post: { select: { id: true, number: true, title: true, status: true } } } },
          agreements: { orderBy: { createdAt: "desc" }, include: { guardian: { select: { fullName: true } } } },
          reviews: { orderBy: { createdAt: "desc" }, include: { author: { select: { fullName: true } } } },
          creditLedger: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      tuitionPosts: { orderBy: { createdAt: "desc" }, take: 50 },
      guardianAgreements: { orderBy: { createdAt: "desc" }, include: { tutorProfile: { select: { user: { select: { fullName: true } } } } } },
      invoices: { orderBy: { issuedAt: "desc" }, take: 50 },
      notifications: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!user) return null;
  const ids = [user.id, user.tutorProfile?.id].filter(Boolean) as string[];
  const [trail, notes] = await Promise.all([
    db.auditLog.findMany({ where: { OR: [{ entityId: { in: ids } }, { actorId: user.id }], NOT: { action: "ADMIN_NOTE" } }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { fullName: true } } } }),
    getNotes("User", user.id),
  ]);
  return { user, trail, notes };
}

export async function adminUpdateUser(actor: SessionUser, userId: string, data: { fullName: string; phone: string | null; lmsUserId: string | null }) {
  assertAdmin(actor);
  const fullName = data.fullName.trim();
  if (fullName.length < 2 || fullName.length > 80) throw new DomainError("VALIDATION", "Name must be 2–80 characters");
  if (data.phone && !/^\+?[0-9 -]{6,20}$/.test(data.phone)) throw new DomainError("VALIDATION", "Invalid phone number");
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new DomainError("NOT_FOUND");
    if (target.role === "ADMIN" && target.id !== actor.id && !actor.isSuperAdmin) throw new DomainError("FORBIDDEN");
    await tx.user.update({ where: { id: userId }, data: { fullName, phone: data.phone || null, lmsUserId: data.lmsUserId || null } });
    await audit(tx, actor.id, "USER_EDIT", "User", userId, { from: { fullName: target.fullName, phone: target.phone }, to: { fullName, phone: data.phone } });
  });
}

/** Super admin override: grant/revoke the badge without the KYC document rule (e.g. a tutor verified in person). */
export async function forceVerification(actor: SessionUser, tutorProfileId: string, status: "VERIFIED" | "UNVERIFIED" | "REJECTED", note?: string) {
  assertAdmin(actor, true);
  return transaction(async (tx) => {
    const p = await tx.tutorProfile.findUnique({ where: { id: tutorProfileId } });
    if (!p) throw new DomainError("NOT_FOUND");
    await tx.tutorProfile.update({ where: { id: p.id }, data: { verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : null, verificationNote: note ?? null } });
    await notify(tx, p.userId, "VERIFICATION", status === "VERIFIED" ? "🎉 You are now a Verified tutor" : "Verification update", note, "/dashboard/kyc");
    await audit(tx, actor.id, `FORCE_VERIFY_${status}`, "TutorProfile", p.id, { note });
  });
}

// ───────────────────────── Tuition posts ─────────────────────────

export async function getPost360(postId: string) {
  const post = await db.tuitionPost.findUnique({
    where: { id: postId },
    include: {
      guardian: { select: { id: true, fullName: true, email: true, phone: true } },
      applications: { orderBy: { createdAt: "asc" }, include: { tutorProfile: { select: { id: true, university: true, verificationStatus: true, user: { select: { id: true, fullName: true, phone: true } } } }, trials: true } },
      agreements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!post) return null;
  const notes = await getNotes("TuitionPost", post.id);
  return { post, notes };
}

export async function adminUpdatePost(actor: SessionUser, postId: string, d: { title: string; budgetMax: number; budgetMin: number | null; daysPerWeek: number; requirements: string | null; addressLine: string | null; maxShortlist: number }) {
  assertAdmin(actor);
  if (d.title.trim().length < 5 || d.budgetMax <= 0 || d.daysPerWeek < 1 || d.daysPerWeek > 7 || d.maxShortlist < 1 || d.maxShortlist > 10 || (d.budgetMin != null && d.budgetMin > d.budgetMax)) throw new DomainError("VALIDATION");
  return transaction(async (tx) => {
    if (!(await lockRow(tx, "tuition_posts", postId))) throw new DomainError("NOT_FOUND");
    const p = await tx.tuitionPost.findUniqueOrThrow({ where: { id: postId } });
    if (d.maxShortlist < p.shortlistedCount) throw new DomainError("VALIDATION", `Already ${p.shortlistedCount} shortlisted`);
    await tx.tuitionPost.update({ where: { id: postId }, data: { title: d.title.trim(), budgetMax: D(d.budgetMax), budgetMin: d.budgetMin == null ? null : D(d.budgetMin), daysPerWeek: d.daysPerWeek, requirements: d.requirements || null, addressLine: d.addressLine || null, maxShortlist: d.maxShortlist } });
    await audit(tx, actor.id, "POST_EDIT", "TuitionPost", postId, d as unknown as Prisma.InputJsonValue);
  });
}

/** Re-open a cancelled job (no live agreement may exist). */
export async function reopenPost(actor: SessionUser, postId: string) {
  assertAdmin(actor);
  return transaction(async (tx) => {
    if (!(await lockRow(tx, "tuition_posts", postId))) throw new DomainError("NOT_FOUND");
    const p = await tx.tuitionPost.findUniqueOrThrow({ where: { id: postId } });
    if (p.status !== "CANCELLED") throw new DomainError("INVALID_STATE");
    const live = await tx.tuitionAgreement.count({ where: { postId, status: { in: ["PENDING_SIGNATURES", "ACTIVE"] } } });
    if (live) throw new DomainError("ALREADY_HIRING");
    await tx.tuitionPost.update({ where: { id: postId }, data: { status: "OPEN", cancelledAt: null, shortlistedCount: 0 } });
    await tx.tuitionApplication.updateMany({ where: { postId, status: "SHORTLISTED" }, data: { status: "PENDING", shortlistedAt: null } });
    await notify(tx, p.guardianId, "POST_REOPENED", `Tuition #${p.number} was re-opened by the admin`, undefined, `/dashboard/jobs/${p.id}/applicants`);
    await audit(tx, actor.id, "POST_REOPEN", "TuitionPost", postId);
  });
}

/** Force an application to REJECTED or back to PENDING, keeping the job's counters consistent. */
export async function adminSetApplicationStatus(actor: SessionUser, applicationId: string, to: Extract<ApplicationStatus, "REJECTED" | "PENDING">, reason?: string) {
  assertAdmin(actor);
  return transaction(async (tx) => {
    const a0 = await tx.tuitionApplication.findUnique({ where: { id: applicationId }, select: { postId: true } });
    if (!a0) throw new DomainError("NOT_FOUND");
    await lockRow(tx, "tuition_posts", a0.postId);
    const a = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: applicationId }, include: { post: true, tutorProfile: { select: { userId: true } } } });
    if (a.status === "CONFIRMED") throw new DomainError("INVALID_STATE", "A hired application can't be changed — end the agreement instead");
    if (to === "REJECTED" && !["PENDING", "SHORTLISTED"].includes(a.status)) throw new DomainError("INVALID_STATE");
    if (to === "PENDING" && !["REJECTED", "WITHDRAWN"].includes(a.status)) throw new DomainError("INVALID_STATE");
    if (to === "PENDING" && !["OPEN", "SHORTLISTED"].includes(a.post.status)) throw new DomainError("INVALID_STATE", "The job is no longer open");
    const liveAg = await tx.tuitionAgreement.count({ where: { applicationId, status: { in: ["PENDING_SIGNATURES", "ACTIVE"] } } });
    if (liveAg) throw new DomainError("ALREADY_HIRING");

    await tx.tuitionApplication.update({ where: { id: a.id }, data: to === "REJECTED" ? { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason || "Removed by admin" } : { status: "PENDING", rejectedAt: null, rejectionReason: null, shortlistedAt: null } });
    if (a.status === "SHORTLISTED") {
      const left = a.post.shortlistedCount - 1;
      await tx.tuitionPost.update({ where: { id: a.postId }, data: { shortlistedCount: Math.max(0, left), ...(left <= 0 && a.post.status === "SHORTLISTED" ? { status: "OPEN" } : {}) } });
    }
    await notify(tx, a.tutorProfile.userId, "APPLICATION_UPDATE", `Your application to tuition #${a.post.number} was updated by the admin`, reason, "/dashboard/applications");
    await audit(tx, actor.id, `APPLICATION_${to}`, "TuitionApplication", a.id, { from: a.status, reason });
  });
}

// ───────────────────────── Agreements ─────────────────────────

export async function getAgreement360(id: string) {
  const ag = await db.tuitionAgreement.findUnique({
    where: { id },
    include: {
      guardian: { select: { id: true, fullName: true, email: true, phone: true } },
      tutorProfile: { select: { id: true, university: true, user: { select: { id: true, fullName: true, email: true, phone: true } } } },
      post: { select: { id: true, number: true, title: true, addressLine: true } },
      invoices: { orderBy: { issuedAt: "desc" }, include: { transactions: { orderBy: { createdAt: "desc" } } } },
      sessions: { orderBy: { date: "desc" }, take: 60 },
      salaryPayments: { orderBy: { periodMonth: "desc" } },
      lmsShares: { orderBy: { createdAt: "desc" } },
      lmsProgress: { orderBy: { recordedAt: "desc" }, take: 20 },
      review: true,
    },
  });
  if (!ag) return null;
  const notes = await getNotes("TuitionAgreement", ag.id);
  return { ag, notes };
}

// ───────────────────────── Reviews ─────────────────────────

export async function deleteReview(actor: SessionUser, reviewId: string) {
  assertAdmin(actor, true);
  return transaction(async (tx) => {
    const r = await tx.review.findUnique({ where: { id: reviewId } });
    if (!r) throw new DomainError("NOT_FOUND");
    await lockRow(tx, "tutor_profiles", r.tutorProfileId);
    await tx.review.delete({ where: { id: r.id } });
    const agg = await tx.review.aggregate({ where: { tutorProfileId: r.tutorProfileId }, _avg: { rating: true }, _count: true });
    await tx.tutorProfile.update({ where: { id: r.tutorProfileId }, data: { ratingAvg: D((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count } });
    await audit(tx, actor.id, "REVIEW_DELETE", "Review", r.id, { rating: r.rating, comment: r.comment, tutorProfileId: r.tutorProfileId });
  });
}

// ───────────────────────── Notes ─────────────────────────

export const NOTE_ENTITIES = ["User", "TuitionPost", "TuitionAgreement"] as const;
export type NoteEntity = (typeof NOTE_ENTITIES)[number];

export function getNotes(entity: NoteEntity, entityId: string) {
  return db.auditLog.findMany({ where: { action: "ADMIN_NOTE", entity, entityId }, orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { fullName: true } } } });
}

export async function addNote(actor: SessionUser, entity: NoteEntity, entityId: string, text: string) {
  assertAdmin(actor);
  const body = text.trim();
  if (!NOTE_ENTITIES.includes(entity) || body.length < 1 || body.length > 2000) throw new DomainError("VALIDATION");
  return transaction((tx) => audit(tx, actor.id, "ADMIN_NOTE", entity, entityId, { text: body }));
}

// ───────────────────────── Notifications ─────────────────────────

export type Audience = { kind: "ALL" } | { kind: "ROLE"; role: UserRole } | { kind: "VERIFIED_TUTORS" } | { kind: "USER"; userId: string };

export async function sendAnnouncement(actor: SessionUser, audience: Audience, title: string, body: string | null, link: string | null) {
  assertAdmin(actor);
  const t = title.trim();
  if (t.length < 3 || t.length > 140 || (body && body.length > 1000)) throw new DomainError("VALIDATION");
  if (link && !/^(\/|https:\/\/)/.test(link)) throw new DomainError("VALIDATION", "Link must start with / or https://");
  if (audience.kind === "ALL" && !actor.isSuperAdmin) throw new DomainError("FORBIDDEN", "Only the super admin can message everyone");
  const where: Prisma.UserWhereInput =
    audience.kind === "ALL" ? { isBlocked: false }
    : audience.kind === "ROLE" ? { role: audience.role, isBlocked: false }
    : audience.kind === "VERIFIED_TUTORS" ? { isBlocked: false, tutorProfile: { verificationStatus: "VERIFIED" } }
    : { id: audience.userId };
  const users = await db.user.findMany({ where, select: { id: true } });
  if (!users.length) throw new DomainError("NOT_FOUND", "No recipients");
  return transaction(async (tx) => {
    await tx.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: "ANNOUNCEMENT", title: t, body: body || null, link: link || null })) });
    await audit(tx, actor.id, "ANNOUNCEMENT", audience.kind === "USER" ? "User" : "Broadcast", audience.kind === "USER" ? audience.userId : audience.kind, { title: t, recipients: users.length, audience } as unknown as Prisma.InputJsonValue);
    return users.length;
  });
}
