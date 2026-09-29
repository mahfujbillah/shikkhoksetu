import "server-only";
import { db } from "@/lib/db";
import type { z } from "zod";
import type { SessionUser } from "../auth";
import { DomainError, isUniqueViolation } from "../errors";
import type { lmsProgressSchema, lmsShareSchema, sessionLogSchema } from "../validation";
import { D, lockRow, notify, transaction } from "./common";

/** Loads an ACTIVE/COMPLETED engagement for one of its parties. */
async function partyAgreement(user: SessionUser, agreementId: string) {
  const ag = await db.tuitionAgreement.findUnique({ where: { id: agreementId }, include: { tutorProfile: { select: { userId: true } } } });
  if (!ag) throw new DomainError("NOT_FOUND");
  const role = ag.guardianId === user.id ? "GUARDIAN" : ag.tutorProfile.userId === user.id ? "TUTOR" : user.role === "ADMIN" ? "ADMIN" : null;
  if (!role) throw new DomainError("FORBIDDEN");
  return { ag, role };
}

// ───────── Attendance / progress log ─────────

export async function logSession(user: SessionUser, input: z.infer<typeof sessionLogSchema>) {
  const { ag, role } = await partyAgreement(user, input.agreementId);
  if (role !== "TUTOR") throw new DomainError("FORBIDDEN");
  if (ag.status !== "ACTIVE") throw new DomainError("INVALID_STATE");
  if (input.date > new Date(Date.now() + 86_400_000)) throw new DomainError("VALIDATION", "Session date cannot be in the future");
  try {
    const s = await db.tutoringSession.create({ data: { ...input, loggedById: user.id } });
    await db.notification.create({ data: { userId: ag.guardianId, type: "SESSION_LOGGED", title: "Session logged — please confirm", body: input.topicsCovered ?? undefined, link: `/dashboard/tuitions/${ag.id}` } });
    return s;
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("VALIDATION", "A session is already logged for that date");
    throw e;
  }
}

export async function confirmSession(user: SessionUser, sessionId: string, feedback?: string, rating?: number) {
  const s = await db.tutoringSession.findUnique({ where: { id: sessionId } });
  if (!s) throw new DomainError("NOT_FOUND");
  const { role } = await partyAgreement(user, s.agreementId);
  if (role !== "GUARDIAN" && role !== "ADMIN") throw new DomainError("FORBIDDEN");
  await db.tutoringSession.update({ where: { id: sessionId }, data: { guardianConfirmed: true, guardianConfirmedAt: new Date(), guardianFeedback: feedback, studentRating: rating } });
}

// ───────── Salary milestones (guardian pays tutor directly; both confirm here) ─────────

export async function recordSalary(user: SessionUser, agreementId: string, periodMonth: string, amount: number, method?: string) {
  if (!/^\d{4}-\d{2}$/.test(periodMonth)) throw new DomainError("VALIDATION");
  const { ag, role } = await partyAgreement(user, agreementId);
  if (role !== "GUARDIAN" && role !== "ADMIN") throw new DomainError("FORBIDDEN");
  if (ag.status !== "ACTIVE" && ag.status !== "COMPLETED") throw new DomainError("INVALID_STATE");
  await db.salaryPayment.upsert({
    where: { agreementId_periodMonth: { agreementId, periodMonth } },
    update: { amount: D(amount), status: "PAID", paidAt: new Date(), method },
    create: { agreementId, periodMonth, amount: D(amount), status: "PAID", paidAt: new Date(), method },
  });
  await db.notification.create({ data: { userId: ag.tutorProfile.userId, type: "SALARY_PAID", title: `Salary for ${periodMonth} marked as paid`, body: "Please confirm you received it.", link: `/dashboard/tuitions/${agreementId}` } });
}

export async function confirmSalaryReceived(user: SessionUser, salaryId: string) {
  const s = await db.salaryPayment.findUnique({ where: { id: salaryId } });
  if (!s) throw new DomainError("NOT_FOUND");
  const { role } = await partyAgreement(user, s.agreementId);
  if (role !== "TUTOR") throw new DomainError("FORBIDDEN");
  if (s.status !== "PAID") throw new DomainError("INVALID_STATE");
  await db.salaryPayment.update({ where: { id: salaryId }, data: { confirmedByTutor: true } });
}

// ───────── Reviews (one per engagement, aggregates updated atomically) ─────────

export async function addReview(user: SessionUser, agreementId: string, rating: number, comment?: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError("VALIDATION");
  const { ag, role } = await partyAgreement(user, agreementId);
  if (role !== "GUARDIAN") throw new DomainError("FORBIDDEN");
  if (ag.status !== "ACTIVE" && ag.status !== "COMPLETED") throw new DomainError("INVALID_STATE");
  try {
    await transaction(async (tx) => {
      await tx.review.create({ data: { agreementId, tutorProfileId: ag.tutorProfileId, authorId: user.id, rating, comment } });
      await lockRow(tx, "tutor_profiles", ag.tutorProfileId);
      const agg = await tx.review.aggregate({ where: { tutorProfileId: ag.tutorProfileId }, _avg: { rating: true }, _count: true });
      await tx.tutorProfile.update({ where: { id: ag.tutorProfileId }, data: { ratingAvg: D((agg._avg.rating ?? 0).toFixed(2)), ratingCount: agg._count } });
      await notify(tx, ag.tutorProfile.userId, "NEW_REVIEW", `You received a ${rating}★ review`, comment, `/tutors/${ag.tutorProfileId}`);
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("VALIDATION", "You have already reviewed this tutor for this tuition");
    throw e;
  }
}

// ───────── LMS integration ─────────

export async function shareLmsResource(user: SessionUser, input: z.infer<typeof lmsShareSchema>) {
  const { ag, role } = await partyAgreement(user, input.agreementId);
  if (role !== "TUTOR") throw new DomainError("FORBIDDEN");
  if (ag.status !== "ACTIVE") throw new DomainError("INVALID_STATE");
  const share = await db.lmsResourceShare.create({ data: { ...input, sharedById: user.id } });
  await db.notification.create({ data: { userId: ag.guardianId, type: "LMS_SHARED", title: `New ${input.type.toLowerCase()} shared: ${input.title}`, link: `/dashboard/tuitions/${ag.id}` } });
  return share;
}

export async function linkLmsStudent(user: SessionUser, agreementId: string, lmsStudentId: string) {
  const { role } = await partyAgreement(user, agreementId);
  if (role === "TUTOR") throw new DomainError("FORBIDDEN"); // guardian (or admin) links their child's LMS account
  await db.tuitionAgreement.update({ where: { id: agreementId }, data: { lmsStudentId: lmsStudentId.trim() || null } });
}

/** Called by the parent LMS (server-to-server). Fans a progress datapoint out to every active engagement of that student. */
export async function ingestLmsProgress(input: z.infer<typeof lmsProgressSchema>) {
  const engagements = await db.tuitionAgreement.findMany({ where: { lmsStudentId: input.lmsStudentId, status: "ACTIVE" }, select: { id: true } });
  if (!engagements.length) return 0;
  await db.lmsProgressSnapshot.createMany({
    data: engagements.map((e) => ({ agreementId: e.id, lmsStudentId: input.lmsStudentId, courseId: input.courseId, courseTitle: input.courseTitle, metric: input.metric, value: input.value, payload: input.payload as object | undefined })),
  });
  return engagements.length;
}

export async function getEngagement(user: SessionUser, agreementId: string) {
  const { role } = await partyAgreement(user, agreementId);
  const ag = await db.tuitionAgreement.findUniqueOrThrow({
    where: { id: agreementId },
    include: {
      guardian: { select: { fullName: true, phone: true, email: true } },
      tutorProfile: { select: { id: true, userId: true, university: true, user: { select: { fullName: true, phone: true, email: true } } } },
      post: { select: { number: true, title: true, addressLine: true } },
      sessions: { orderBy: { date: "desc" }, take: 60 },
      salaryPayments: { orderBy: { periodMonth: "desc" } },
      lmsShares: { orderBy: { createdAt: "desc" } },
      lmsProgress: { orderBy: { recordedAt: "desc" }, take: 30 },
      review: true,
      invoices: { orderBy: { issuedAt: "desc" } },
    },
  });
  return { ag, role };
}

export function listMyEngagements(user: SessionUser) {
  return db.tuitionAgreement.findMany({
    where: { OR: [{ guardianId: user.id }, { tutorProfile: { userId: user.id } }], status: { in: ["PENDING_SIGNATURES", "ACTIVE", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    include: { post: { select: { number: true, title: true } }, guardian: { select: { fullName: true } }, tutorProfile: { select: { userId: true, user: { select: { fullName: true } } } }, _count: { select: { sessions: true } } },
  });
}
