import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { CURRICULA, gradeLabel, locationLabel, subjectLabel, TUITION_TYPES } from "@/lib/catalog";
import type { SessionUser } from "../auth";
import { DomainError, isUniqueViolation } from "../errors";
import type { HireInput, TrialInput } from "../validation";
import { createInvoice } from "./billing";
import { audit, D, getSettings, lockRow, notify, transaction } from "./common";

// ───────────────────────── Trial classes ─────────────────────────

/**
 * Meeting link strategy
 *  • ONLINE_LMS  → the parent LMS live classroom (LMS_LIVE_BASE_URL/live/<trialId>) with whiteboard.
 *  • ONLINE_MEET → a pasted Google Meet link if provided, otherwise an auto-generated Jitsi room
 *                  (free, no API keys). Auto-creating Google Meet links needs Google Calendar OAuth —
 *                  plug it in here if/when those credentials exist.
 */
function meetingLinkFor(mode: TrialInput["mode"], trialId: string, provided?: string) {
  if (mode === "IN_PERSON") return null;
  if (mode === "ONLINE_LMS" && process.env.LMS_LIVE_BASE_URL) return `${process.env.LMS_LIVE_BASE_URL.replace(/\/$/, "")}/live/${trialId}`;
  if (provided) return provided;
  return `https://meet.jit.si/ShikkhokSetu-${randomBytes(6).toString("hex")}`;
}

export async function scheduleTrial(user: SessionUser, input: TrialInput) {
  const app = await db.tuitionApplication.findUnique({
    where: { id: input.applicationId },
    include: { post: true, tutorProfile: { select: { userId: true } } },
  });
  if (!app) throw new DomainError("NOT_FOUND");
  if (app.post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  if (app.status !== "SHORTLISTED") throw new DomainError("INVALID_STATE");

  return transaction(async (tx) => {
    const trial = await tx.trialSession.create({
      data: {
        applicationId: app.id,
        createdById: user.id,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        mode: input.mode,
        location: input.mode === "IN_PERSON" ? input.location : null,
        isPaid: input.isPaid,
        fee: input.isPaid && input.fee ? D(input.fee) : null,
      },
    });
    const link = meetingLinkFor(input.mode, trial.id, input.meetingLink);
    await tx.trialSession.update({ where: { id: trial.id }, data: { meetingLink: link } });

    // A paid trial is billed to the guardian; the fee is passed to the tutor outside the platform.
    if (input.isPaid && input.fee) {
      await createInvoice(tx, { type: "TRIAL_FEE", billedToId: app.post.guardianId, amount: input.fee, trialSessionId: trial.id, lineItems: [{ label: `Trial class — tuition #${app.post.number}`, amount: input.fee }] });
    }
    await notify(tx, app.tutorProfile.userId, "TRIAL_SCHEDULED", `Trial class scheduled — tuition #${app.post.number}`, `${input.scheduledAt.toISOString()} · ${input.mode}${link ? ` · ${link}` : ""}`, "/dashboard/applications");
    return { ...trial, meetingLink: link };
  });
}

export async function updateTrialOutcome(user: SessionUser, trialId: string, outcome: { status: "COMPLETED" | "CANCELLED" | "NO_SHOW"; feedback?: string; rating?: number }) {
  const trial = await db.trialSession.findUnique({ where: { id: trialId }, include: { application: { include: { post: true, tutorProfile: true } } } });
  if (!trial) throw new DomainError("NOT_FOUND");
  const isGuardian = trial.application.post.guardianId === user.id;
  const isTutor = trial.application.tutorProfile.userId === user.id;
  if (!isGuardian && !isTutor && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  const res = await db.trialSession.updateMany({
    where: { id: trialId, status: "SCHEDULED" },
    data: isTutor
      ? { status: outcome.status, tutorFeedback: outcome.feedback }
      : { status: outcome.status, guardianFeedback: outcome.feedback, guardianRating: outcome.rating },
  });
  if (res.count !== 1) throw new DomainError("INVALID_STATE");
}

// ───────────────────────── Agreement (hire) ─────────────────────────

function renderTerms(a: {
  number: number; guardianName: string; tutorName: string; university: string; grade: string; curriculum: string; subjects: string[];
  tuitionType: string; location: string; salary: number; days: number; minutes: number; startDate: Date; commissionRate: number;
  commissionAmount: number; commissionPayer: "TUTOR" | "GUARDIAN"; specialTerms?: string;
}) {
  const L = "en" as const;
  const subjects = a.subjects.map((s) => subjectLabel(s, L)).join(", ");
  return [
    `TUITION AGREEMENT / CONFIRMATION LETTER — Job #${a.number}`,
    ``,
    `1. PARTIES`,
    `   Guardian: ${a.guardianName}`,
    `   Tutor: ${a.tutorName} (${a.university})`,
    ``,
    `2. ENGAGEMENT`,
    `   Class/Grade: ${gradeLabel(a.grade, L)} · Curriculum: ${CURRICULA[a.curriculum]?.en ?? a.curriculum}`,
    `   Subjects: ${subjects}`,
    `   Mode: ${TUITION_TYPES[a.tuitionType]?.en ?? a.tuitionType} · Location: ${a.location}`,
    `   Schedule: ${a.days} day(s) per week, ${a.minutes} minutes per session`,
    `   Start date: ${a.startDate.toISOString().slice(0, 10)}`,
    ``,
    `3. REMUNERATION`,
    `   Monthly salary: BDT ${a.salary.toLocaleString("en-IN")}, paid by the guardian directly to the tutor within the first 7 days of each month.`,
    `   Platform service charge: ${a.commissionRate}% of the first month's salary (BDT ${a.commissionAmount.toLocaleString("en-IN")}), payable by the ${a.commissionPayer === "TUTOR" ? "tutor" : "guardian"} through ShikkhokSetu within the invoice due date.`,
    ``,
    `4. CONDUCT & ATTENDANCE`,
    `   The tutor logs every session on the platform; the guardian confirms it. Missed sessions are rescheduled within the same month where possible.`,
    `   Either party may end the engagement with 7 days' written notice through the platform.`,
    `   Both parties agree not to settle outside the platform to avoid the service charge while this agreement is active.`,
    ``,
    `5. SAFETY`,
    `   The tutor's identity has been verified by ShikkhokSetu (NID/Passport + education documents). Guardians should keep a family member present for home tuition of minors.`,
    ...(a.specialTerms ? [``, `6. SPECIAL TERMS`, `   ${a.specialTerms}`] : []),
    ``,
    `This agreement becomes binding when both parties sign electronically on ShikkhokSetu. Each signature records the typed full name, time and IP address.`,
  ].join("\n");
}

/**
 * GUARDIAN: "ACCEPT & HIRE" → generates the digital agreement (guardian signs immediately).
 *
 * Edge cases handled
 *  • Only the job owner; job must still be OPEN/SHORTLISTED; the applicant must be SHORTLISTED.
 *  • The tutor must *still* be VERIFIED (verification can be revoked after they applied).
 *  • Double-hire protection: job row is locked FOR UPDATE, and a partial UNIQUE index allows only one
 *    PENDING_SIGNATURES/ACTIVE agreement per job — a concurrent second hire gets ALREADY_HIRING.
 *  • The hire is only *locked* when the tutor counter-signs (signAgreementAsTutor).
 */
export async function hireAndGenerateAgreement(user: SessionUser, input: HireInput, ip: string | null) {
  const app = await db.tuitionApplication.findUnique({
    where: { id: input.applicationId },
    include: { tutorProfile: { include: { user: { select: { fullName: true, id: true } } } }, post: { include: { guardian: { select: { fullName: true } } } } },
  });
  if (!app) throw new DomainError("NOT_FOUND");
  if (app.post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  if (input.signature.trim().toLowerCase() !== app.post.guardian.fullName.trim().toLowerCase() && user.role !== "ADMIN") {
    throw new DomainError("SIGNATURE_REQUIRED", "Signature must match your account name");
  }

  const settings = await getSettings();
  const rate = settings.monetizationMode === "CREDITS" ? 0 : Number(settings.commissionRate);
  const commissionAmount = Math.round((input.monthlySalary * rate) / 100);

  try {
    return await transaction(async (tx) => {
      await lockRow(tx, "tuition_posts", app.postId);
      const post = await tx.tuitionPost.findUniqueOrThrow({ where: { id: app.postId } });
      if (post.status !== "OPEN" && post.status !== "SHORTLISTED") throw new DomainError("INVALID_STATE");
      const fresh = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: app.id }, include: { tutorProfile: { select: { verificationStatus: true } } } });
      if (fresh.status !== "SHORTLISTED") throw new DomainError("INVALID_STATE");
      if (fresh.tutorProfile.verificationStatus !== "VERIFIED") throw new DomainError("TUTOR_NOT_VERIFIED");

      // The street address stays out of the signed text; it's revealed on the engagement page once ACTIVE.
      const location = locationLabel(post, "en");
      const terms = renderTerms({
        number: post.number, guardianName: app.post.guardian.fullName, tutorName: app.tutorProfile.user.fullName, university: app.tutorProfile.university,
        grade: post.grade, curriculum: post.curriculum, subjects: post.subjects, tuitionType: post.tuitionType, location,
        salary: input.monthlySalary, days: input.daysPerWeek, minutes: input.sessionMinutes, startDate: input.startDate,
        commissionRate: rate, commissionAmount, commissionPayer: settings.commissionPayer, specialTerms: input.specialTerms,
      });

      const agreement = await tx.tuitionAgreement.create({
        data: {
          applicationId: app.id, postId: post.id, guardianId: post.guardianId, tutorProfileId: app.tutorProfileId,
          monthlySalary: D(input.monthlySalary), daysPerWeek: input.daysPerWeek, sessionMinutes: input.sessionMinutes, startDate: input.startDate,
          tuitionType: post.tuitionType, grade: post.grade, curriculum: post.curriculum, subjects: post.subjects, location, specialTerms: input.specialTerms,
          terms, commissionRate: D(rate), commissionAmount: D(commissionAmount), commissionPayer: settings.commissionPayer,
          paymentStatus: commissionAmount === 0 ? "WAIVED" : "UNPAID",
          guardianSignature: input.signature, guardianSignedAt: new Date(), guardianSignedIp: ip,
        },
        select: { id: true, agreementNumber: true },
      });
      await notify(tx, app.tutorProfile.user.id, "AGREEMENT_READY", `Offer received — tuition #${post.number}`, `Review and sign agreement #${agreement.agreementNumber} to confirm the hire.`, `/dashboard/agreements/${agreement.id}`);
      await audit(tx, user.id, "AGREEMENT_CREATE", "TuitionAgreement", agreement.id, { applicationId: app.id });
      return agreement;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("ALREADY_HIRING");
    throw e;
  }
}

/**
 * TUTOR COUNTER-SIGNS → hire is locked atomically:
 *  agreement ACTIVE · application CONFIRMED · job CONFIRMED · other applicants REJECTED ·
 *  commission invoice issued (idempotent via UNIQUE(agreementId, type)) · first salary milestone created.
 */
export async function signAgreementAsTutor(user: SessionUser, agreementId: string, signature: string, ip: string | null) {
  return transaction(async (tx) => {
    if (!(await lockRow(tx, "tuition_agreements", agreementId))) throw new DomainError("NOT_FOUND");
    const ag = await tx.tuitionAgreement.findUniqueOrThrow({ where: { id: agreementId }, include: { tutorProfile: { include: { user: true } }, post: true } });
    if (ag.tutorProfile.userId !== user.id) throw new DomainError("FORBIDDEN");
    if (ag.status !== "PENDING_SIGNATURES" || !ag.guardianSignedAt) throw new DomainError("INVALID_STATE");
    if (signature.trim().toLowerCase() !== ag.tutorProfile.user.fullName.trim().toLowerCase()) throw new DomainError("SIGNATURE_REQUIRED", "Signature must match your account name");

    await lockRow(tx, "tuition_posts", ag.postId);
    const now = new Date();
    await tx.tuitionAgreement.update({ where: { id: ag.id }, data: { tutorSignature: signature, tutorSignedAt: now, tutorSignedIp: ip, status: "ACTIVE", activatedAt: now } });
    await tx.tuitionApplication.update({ where: { id: ag.applicationId }, data: { status: "CONFIRMED" } });
    const others = await tx.tuitionApplication.findMany({ where: { postId: ag.postId, id: { not: ag.applicationId }, status: { in: ["PENDING", "SHORTLISTED"] } }, select: { id: true, tutorProfile: { select: { userId: true } } } });
    await tx.tuitionApplication.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "REJECTED", rejectedAt: now, rejectionReason: "Position filled" } });
    await tx.tuitionPost.update({ where: { id: ag.postId }, data: { status: "CONFIRMED", hiredAt: now } });

    const payerId = ag.commissionPayer === "TUTOR" ? ag.tutorProfile.userId : ag.guardianId;
    const amount = Number(ag.commissionAmount);
    if (amount > 0) {
      const existing = await tx.invoice.findUnique({ where: { agreementId_type: { agreementId: ag.id, type: "PLATFORM_COMMISSION" } } });
      if (!existing) {
        await createInvoice(tx, {
          type: "PLATFORM_COMMISSION", billedToId: payerId, amount, agreementId: ag.id,
          lineItems: [{ label: `Platform service charge — ${Number(ag.commissionRate)}% of first month (agreement #${ag.agreementNumber})`, amount }],
        });
      }
    }
    const period = ag.startDate.toISOString().slice(0, 7);
    await tx.salaryPayment.upsert({ where: { agreementId_periodMonth: { agreementId: ag.id, periodMonth: period } }, update: {}, create: { agreementId: ag.id, periodMonth: period, amount: ag.monthlySalary } });

    await notify(tx, ag.guardianId, "HIRE_CONFIRMED", `Hire confirmed — tuition #${ag.post.number}`, `${ag.tutorProfile.user.fullName} signed agreement #${ag.agreementNumber}. Contact details are now visible.`, `/dashboard/tuitions/${ag.id}`);
    for (const o of others) await notify(tx, o.tutorProfile.userId, "APPLICATION_CLOSED", `Tuition #${ag.post.number} has been filled`, "Thank you for applying — keep an eye on new matching jobs.", "/tuitions");
    await audit(tx, user.id, "AGREEMENT_ACTIVATE", "TuitionAgreement", ag.id);
    return { agreementId: ag.id };
  });
}

/** Either party can withdraw an agreement that has not become ACTIVE yet (the application returns to SHORTLISTED). */
export async function cancelPendingAgreement(user: SessionUser, agreementId: string, reason?: string) {
  return transaction(async (tx) => {
    if (!(await lockRow(tx, "tuition_agreements", agreementId))) throw new DomainError("NOT_FOUND");
    const ag = await tx.tuitionAgreement.findUniqueOrThrow({ where: { id: agreementId }, include: { tutorProfile: true } });
    const isParty = ag.guardianId === user.id || ag.tutorProfile.userId === user.id;
    if (!isParty && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    if (ag.status !== "PENDING_SIGNATURES") throw new DomainError("INVALID_STATE");
    await tx.tuitionAgreement.update({ where: { id: ag.id }, data: { status: "CANCELLED", endedAt: new Date(), endReason: reason ?? "Withdrawn before signing" } });
    const other = ag.guardianId === user.id ? ag.tutorProfile.userId : ag.guardianId;
    await notify(tx, other, "AGREEMENT_CANCELLED", `Agreement #${ag.agreementNumber} was withdrawn`, reason, `/dashboard`);
  });
}

/** End an ACTIVE engagement (completed or terminated with notice). */
export async function endAgreement(user: SessionUser, agreementId: string, kind: "COMPLETED" | "TERMINATED", reason: string) {
  return transaction(async (tx) => {
    await lockRow(tx, "tuition_agreements", agreementId);
    const ag = await tx.tuitionAgreement.findUniqueOrThrow({ where: { id: agreementId }, include: { tutorProfile: true } });
    const isParty = ag.guardianId === user.id || ag.tutorProfile.userId === user.id;
    if (!isParty && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    if (ag.status !== "ACTIVE") throw new DomainError("INVALID_STATE");
    await tx.tuitionAgreement.update({ where: { id: ag.id }, data: { status: kind, endedAt: new Date(), endReason: reason } });
    if (kind === "COMPLETED") await tx.tutorProfile.update({ where: { id: ag.tutorProfileId }, data: { completedTuitions: { increment: 1 } } });
  });
}

/** Loads an agreement for one of its parties (or admin), revealing contacts only when ACTIVE+. */
export async function getAgreementForParty(user: SessionUser, agreementId: string) {
  const ag = await db.tuitionAgreement.findUnique({
    where: { id: agreementId },
    include: {
      guardian: { select: { id: true, fullName: true, phone: true, email: true } },
      tutorProfile: { select: { id: true, userId: true, university: true, department: true, user: { select: { fullName: true, phone: true, email: true } } } },
      post: { select: { id: true, number: true, title: true, addressLine: true } },
      invoices: { orderBy: { issuedAt: "desc" } },
    },
  });
  if (!ag) throw new DomainError("NOT_FOUND");
  const role = ag.guardianId === user.id ? "GUARDIAN" : ag.tutorProfile.userId === user.id ? "TUTOR" : user.role === "ADMIN" ? "ADMIN" : null;
  if (!role) throw new DomainError("FORBIDDEN");
  const reveal = ag.status === "ACTIVE" || ag.status === "COMPLETED" || role === "ADMIN";
  if (!reveal) {
    ag.guardian.phone = null;
    ag.tutorProfile.user.phone = null;
    ag.post.addressLine = null;
  }
  return { agreement: ag, viewerRole: role, contactsVisible: reveal };
}
