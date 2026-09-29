import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "../auth";
import { DomainError, isUniqueViolation } from "../errors";
import type { ApplyInput } from "../validation";
import { MAX_APPLICANTS } from "@/lib/catalog";
import { audit, getSettings, lockRow, notify, transaction, type Tx } from "./common";

/**
 * TUTOR APPLIES TO A JOB
 *
 * Guards (in order, cheapest first):
 *  1. role = TUTOR, account not blocked                      → FORBIDDEN / BLOCKED (requireUser)
 *  2. tutor profile exists and is VERIFIED                   → PROFILE_REQUIRED / TUTOR_NOT_VERIFIED
 *  3. job exists, is OPEN/SHORTLISTED, not the tutor's own   → JOB_CLOSED / OWN_JOB
 *  4. gender preference respected                            → GENDER_MISMATCH
 *  5. fewer than MAX_APPLICANTS live applications            → APPLICATIONS_FULL
 *  6. not already applied                                    → DUPLICATE_APPLICATION
 *  7. enough credits when monetisation uses credits          → INSUFFICIENT_CREDITS
 *
 * Concurrency:
 *  • The job row is locked FOR UPDATE, so a job that is being confirmed/cancelled at the same instant
 *    cannot accept a late application, and applicationsCount is incremented exactly once per insert.
 *  • The UNIQUE(postId, tutorProfileId) index is the final arbiter against double-clicks / two tabs:
 *    the loser of the race gets P2002, which we translate into DUPLICATE_APPLICATION. Because the insert,
 *    counter update and credit spend share one transaction, the loser's credits are never charged.
 *  • Credits are spent with a conditional UPDATE (balance >= cost) — no read-modify-write race.
 */
export async function applyToTuition(user: SessionUser, input: ApplyInput) {
  if (user.role !== "TUTOR") throw new DomainError("FORBIDDEN");

  const profile = await db.tutorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, gender: true, verificationStatus: true },
  });
  if (!profile) throw new DomainError("PROFILE_REQUIRED");
  if (profile.verificationStatus !== "VERIFIED") throw new DomainError("TUTOR_NOT_VERIFIED");

  // Fast, friendly pre-check (the unique index below still covers the race).
  const already = await db.tuitionApplication.findUnique({
    where: { postId_tutorProfileId: { postId: input.postId, tutorProfileId: profile.id } },
    select: { id: true },
  });
  if (already) throw new DomainError("DUPLICATE_APPLICATION");

  const settings = await getSettings();
  const creditCost = settings.monetizationMode === "COMMISSION" ? 0 : settings.applyCreditCost;

  try {
    return await transaction(async (tx) => {
      if (!(await lockRow(tx, "tuition_posts", input.postId))) throw new DomainError("NOT_FOUND");
      const post = await tx.tuitionPost.findUniqueOrThrow({
        where: { id: input.postId },
        select: { id: true, number: true, status: true, guardianId: true, genderPreference: true, title: true, applicationsCount: true },
      });
      if (post.status !== "OPEN" && post.status !== "SHORTLISTED") throw new DomainError("JOB_CLOSED");
      if (post.guardianId === user.id) throw new DomainError("OWN_JOB");
      if (post.genderPreference !== "ANY" && post.genderPreference !== profile.gender) throw new DomainError("GENDER_MISMATCH");
      // Read under the row lock, so two tutors racing for the last slot can't both get in.
      if (post.applicationsCount >= MAX_APPLICANTS) throw new DomainError("APPLICATIONS_FULL");

      const application = await tx.tuitionApplication.create({
        data: {
          postId: post.id,
          tutorProfileId: profile.id,
          coverNote: input.coverNote,
          proposedSalary: input.proposedSalary,
          availability: input.availability,
          creditsSpent: creditCost,
        },
        select: { id: true },
      });

      if (creditCost > 0) {
        const spent = await tx.tutorProfile.updateMany({
          where: { id: profile.id, creditBalance: { gte: creditCost } },
          data: { creditBalance: { decrement: creditCost } },
        });
        if (spent.count !== 1) throw new DomainError("INSUFFICIENT_CREDITS"); // rolls back the insert too
        await tx.creditLedger.create({ data: { tutorProfileId: profile.id, delta: -creditCost, reason: `APPLY:${application.id}` } });
      }

      const updated = await tx.tuitionPost.update({ where: { id: post.id }, data: { applicationsCount: { increment: 1 } }, select: { applicationsCount: true } });
      await notify(tx, post.guardianId, "NEW_APPLICATION", `New applicant for tuition #${post.number}`, `${user.fullName} applied to “${post.title}”.`, `/dashboard/jobs/${post.id}/applicants`);
      return { ...application, applicationsCount: updated.applicationsCount };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("DUPLICATE_APPLICATION");
    throw e;
  }
}

export async function withdrawApplication(user: SessionUser, applicationId: string) {
  const app = await db.tuitionApplication.findUnique({ where: { id: applicationId }, include: { tutorProfile: { select: { userId: true } } } });
  if (!app) throw new DomainError("NOT_FOUND");
  if (app.tutorProfile.userId !== user.id) throw new DomainError("FORBIDDEN");

  return transaction(async (tx) => {
    await lockRow(tx, "tuition_posts", app.postId);
    const { status: before } = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { status: true } });
    const res = await tx.tuitionApplication.updateMany({
      where: { id: applicationId, status: { in: ["PENDING", "SHORTLISTED"] }, agreement: { is: null } },
      data: { status: "WITHDRAWN" },
    });
    if (res.count !== 1) throw new DomainError("INVALID_STATE");
    if (before === "SHORTLISTED") await releaseShortlistSlot(tx, app.postId);
    // applicationsCount is the *live* count shown on the board ("4/10 applied") — a withdrawal frees a slot.
    await tx.tuitionPost.updateMany({ where: { id: app.postId, applicationsCount: { gt: 0 } }, data: { applicationsCount: { decrement: 1 } } });
  });
}

/** Loads a job with its applicants for the owning guardian (or admin) — tutor contact details excluded. */
export async function getApplicantsForGuardian(user: SessionUser, postId: string) {
  const post = await db.tuitionPost.findUnique({
    where: { id: postId },
    include: {
      applications: {
        where: { status: { not: "WITHDRAWN" } },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: {
          tutorProfile: {
            select: {
              id: true, gender: true, headline: true, university: true, department: true, degree: true, currentlyStudying: true,
              experienceYears: true, ratingAvg: true, ratingCount: true, completedTuitions: true, verificationStatus: true,
              subjects: true, curricula: true, tuitionTypes: true, monthlyRate: true,
              user: { select: { fullName: true } },
            },
          },
          trials: { orderBy: { scheduledAt: "desc" } },
          agreement: { select: { id: true, status: true } },
        },
      },
      agreements: { where: { status: { in: ["PENDING_SIGNATURES", "ACTIVE"] } }, select: { id: true, status: true, applicationId: true } },
    },
  });
  if (!post) throw new DomainError("NOT_FOUND");
  if (post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  return post;
}

/**
 * GUARDIAN SHORTLISTS AN APPLICANT (max N per job, default 5)
 * The job row lock serialises concurrent shortlist clicks, so two requests can never both take
 * the last slot; the CHECK constraint on shortlistedCount is a second, database-level guard.
 * The status transition uses a conditional updateMany, making the call idempotent.
 */
export async function shortlistApplicant(user: SessionUser, applicationId: string, guardianNote?: string) {
  const app = await db.tuitionApplication.findUnique({ where: { id: applicationId }, select: { postId: true } });
  if (!app) throw new DomainError("NOT_FOUND");

  return transaction(async (tx) => {
    await lockRow(tx, "tuition_posts", app.postId);
    const post = await tx.tuitionPost.findUniqueOrThrow({ where: { id: app.postId } });
    if (post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    if (post.status !== "OPEN" && post.status !== "SHORTLISTED") throw new DomainError("INVALID_STATE");
    if (post.shortlistedCount >= post.maxShortlist) throw new DomainError("SHORTLIST_FULL");

    const moved = await tx.tuitionApplication.updateMany({
      where: { id: applicationId, postId: post.id, status: "PENDING" },
      data: { status: "SHORTLISTED", shortlistedAt: new Date(), guardianNote },
    });
    if (moved.count === 0) {
      const current = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { status: true } });
      if (current.status === "SHORTLISTED") return { alreadyShortlisted: true }; // idempotent
      throw new DomainError("INVALID_STATE");
    }

    await tx.tuitionPost.update({ where: { id: post.id }, data: { shortlistedCount: { increment: 1 }, status: "SHORTLISTED" } });
    const tutor = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { tutorProfile: { select: { userId: true } } } });
    await notify(tx, tutor.tutorProfile.userId, "SHORTLISTED", `You were shortlisted for tuition #${post.number}`, `The guardian of “${post.title}” shortlisted you. Expect a trial class invitation.`, "/dashboard/applications");
    await audit(tx, user.id, "SHORTLIST", "TuitionApplication", applicationId);
    return { alreadyShortlisted: false };
  });
}

export async function removeFromShortlist(user: SessionUser, applicationId: string) {
  const app = await db.tuitionApplication.findUnique({ where: { id: applicationId }, select: { postId: true } });
  if (!app) throw new DomainError("NOT_FOUND");
  return transaction(async (tx) => {
    await lockRow(tx, "tuition_posts", app.postId);
    const post = await tx.tuitionPost.findUniqueOrThrow({ where: { id: app.postId } });
    if (post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    const moved = await tx.tuitionApplication.updateMany({
      where: { id: applicationId, status: "SHORTLISTED", agreement: { is: null } },
      data: { status: "PENDING", shortlistedAt: null },
    });
    if (moved.count !== 1) throw new DomainError("INVALID_STATE");
    await releaseShortlistSlot(tx, post.id);
  });
}

export async function rejectApplicant(user: SessionUser, applicationId: string, reason?: string) {
  const app = await db.tuitionApplication.findUnique({ where: { id: applicationId }, select: { postId: true } });
  if (!app) throw new DomainError("NOT_FOUND");
  return transaction(async (tx) => {
    await lockRow(tx, "tuition_posts", app.postId);
    const post = await tx.tuitionPost.findUniqueOrThrow({ where: { id: app.postId } });
    if (post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    const { status: before } = await tx.tuitionApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { status: true } });
    const moved = await tx.tuitionApplication.updateMany({
      where: { id: applicationId, status: { in: ["PENDING", "SHORTLISTED"] }, agreement: { is: null } },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason ?? null },
    });
    if (moved.count !== 1) throw new DomainError("INVALID_STATE");
    if (before === "SHORTLISTED") await releaseShortlistSlot(tx, post.id);
  });
}

/** Decrement the shortlist counter; fall back to OPEN when nobody is shortlisted anymore. */
async function releaseShortlistSlot(tx: Tx, postId: string) {
  const p = await tx.tuitionPost.update({ where: { id: postId }, data: { shortlistedCount: { decrement: 1 } }, select: { shortlistedCount: true, status: true } });
  if (p.shortlistedCount === 0 && p.status === "SHORTLISTED") await tx.tuitionPost.update({ where: { id: postId }, data: { status: "OPEN" } });
}

export function listMyApplications(user: SessionUser) {
  return db.tuitionApplication.findMany({
    where: { tutorProfile: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      post: { select: { id: true, number: true, title: true, grade: true, subjects: true, tuitionType: true, isOnline: true, city: true, area: true, budgetMax: true, status: true } },
      trials: { orderBy: { scheduledAt: "desc" }, take: 1 },
      agreement: { select: { id: true, status: true } },
    },
  });
}
