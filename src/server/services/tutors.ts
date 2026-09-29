import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { KycDocumentType } from "@/generated/prisma/enums";
import type { SessionUser } from "../auth";
import { DomainError } from "../errors";
import type { TutorProfileInput } from "../validation";
import { audit, D, notify, transaction } from "./common";

// ───────── Tutor profile ─────────

export async function upsertTutorProfile(user: SessionUser, input: TutorProfileInput) {
  if (user.role !== "TUTOR") throw new DomainError("FORBIDDEN");
  const { fullName, phone, monthlyRate, hourlyRate, ...rest } = input;
  const data = { ...rest, monthlyRate: monthlyRate != null ? D(monthlyRate) : null, hourlyRate: hourlyRate != null ? D(hourlyRate) : null };
  return transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { fullName, phone } });
    return tx.tutorProfile.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } });
  });
}

export function getMyTutorProfile(userId: string) {
  return db.tutorProfile.findUnique({ where: { userId }, include: { kycDocuments: { orderBy: { createdAt: "desc" } }, user: { select: { fullName: true, phone: true } } } });
}

export type DirectoryFilters = { subject?: string; city?: string; curriculum?: string; gender?: "MALE" | "FEMALE"; verifiedOnly?: boolean; q?: string; page?: number };

/** Public tutor directory — contact fields are never selected. */
export async function listTutors(f: DirectoryFilters) {
  const where: Prisma.TutorProfileWhereInput = { user: { isBlocked: false } };
  if (f.verifiedOnly !== false) where.verificationStatus = "VERIFIED";
  if (f.subject) where.subjects = { has: f.subject };
  if (f.city) where.preferredCities = { has: f.city };
  if (f.curriculum) where.curricula = { has: f.curriculum as never };
  if (f.gender) where.gender = f.gender;
  if (f.q) where.OR = [{ university: { contains: f.q, mode: "insensitive" } }, { department: { contains: f.q, mode: "insensitive" } }, { user: { fullName: { contains: f.q, mode: "insensitive" } } }];
  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    db.tutorProfile.findMany({ where, orderBy: [{ ratingAvg: "desc" }, { completedTuitions: "desc" }, { createdAt: "desc" }], skip: (page - 1) * 12, take: 12, select: PUBLIC_TUTOR_SELECT }),
    db.tutorProfile.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 12)) };
}

export const PUBLIC_TUTOR_SELECT = {
  id: true, gender: true, headline: true, bio: true, university: true, department: true, degree: true, graduationYear: true, currentlyStudying: true,
  experienceYears: true, monthlyRate: true, hourlyRate: true, subjects: true, grades: true, curricula: true, tuitionTypes: true,
  preferredCities: true, preferredAreas: true, verificationStatus: true, ratingAvg: true, ratingCount: true, completedTuitions: true,
  user: { select: { fullName: true } },
} satisfies Prisma.TutorProfileSelect;

export function getPublicTutor(id: string) {
  return db.tutorProfile.findUnique({
    where: { id },
    select: { ...PUBLIC_TUTOR_SELECT, reviews: { orderBy: { createdAt: "desc" }, take: 10, select: { rating: true, comment: true, createdAt: true, author: { select: { fullName: true } } } } },
  });
}

// ───────── KYC ─────────

const IDENTITY: KycDocumentType[] = ["NID", "PASSPORT"];
const EDUCATION: KycDocumentType[] = ["STUDENT_ID", "EDUCATIONAL_CERTIFICATE"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Records a document the tutor already uploaded to the private `kyc` bucket from the browser.
 * The path must live under the tutor's own folder (Storage RLS enforces the same rule on upload).
 */
export async function recordKycDocument(user: SessionUser, doc: { type: KycDocumentType; storagePath: string; fileName: string; mimeType: string; sizeBytes: number }) {
  if (user.role !== "TUTOR") throw new DomainError("FORBIDDEN");
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new DomainError("PROFILE_REQUIRED");
  if (!doc.storagePath.startsWith(`${user.id}/`) || doc.storagePath.includes("..")) throw new DomainError("FORBIDDEN");
  if (!ALLOWED_MIME.includes(doc.mimeType) || doc.sizeBytes > 5 * 1024 * 1024) throw new DomainError("VALIDATION", "Upload a JPG, PNG, WEBP or PDF up to 5 MB");
  return db.kycDocument.create({ data: { ...doc, tutorProfileId: profile.id } });
}

/** Tutor submits documents for review → PENDING. Requires one identity + one education document. */
export async function submitForVerification(user: SessionUser) {
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, include: { kycDocuments: true } });
  if (!profile) throw new DomainError("PROFILE_REQUIRED");
  if (profile.verificationStatus === "VERIFIED" || profile.verificationStatus === "PENDING") throw new DomainError("INVALID_STATE");
  const usable = profile.kycDocuments.filter((d) => d.status !== "REJECTED");
  if (!usable.some((d) => IDENTITY.includes(d.type)) || !usable.some((d) => EDUCATION.includes(d.type))) throw new DomainError("KYC_INCOMPLETE");
  await db.tutorProfile.update({ where: { id: profile.id }, data: { verificationStatus: "PENDING", verificationNote: null } });
}

export async function reviewKycDocument(admin: SessionUser, docId: string, approve: boolean, reason?: string) {
  return transaction(async (tx) => {
    const doc = await tx.kycDocument.update({ where: { id: docId }, data: { status: approve ? "APPROVED" : "REJECTED", rejectionReason: approve ? null : reason ?? "Unclear or invalid document", reviewedById: admin.id, reviewedAt: new Date() } });
    await audit(tx, admin.id, approve ? "KYC_APPROVE" : "KYC_REJECT", "KycDocument", docId, { reason });
    return doc;
  });
}

/** Issue or revoke the Verified badge. VERIFIED requires an approved identity AND education document. */
export async function setTutorVerification(admin: SessionUser, tutorProfileId: string, status: "VERIFIED" | "REJECTED" | "UNVERIFIED", note?: string) {
  return transaction(async (tx) => {
    const p = await tx.tutorProfile.findUnique({ where: { id: tutorProfileId }, include: { kycDocuments: true } });
    if (!p) throw new DomainError("NOT_FOUND");
    if (status === "VERIFIED") {
      const ok = p.kycDocuments.filter((d) => d.status === "APPROVED");
      if (!ok.some((d) => IDENTITY.includes(d.type)) || !ok.some((d) => EDUCATION.includes(d.type))) throw new DomainError("KYC_INCOMPLETE");
    }
    await tx.tutorProfile.update({ where: { id: p.id }, data: { verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : null, verificationNote: note ?? null } });
    await notify(tx, p.userId, "VERIFICATION", status === "VERIFIED" ? "🎉 You are now a Verified tutor" : "Verification update", status === "VERIFIED" ? "You can now apply to tuitions." : note, "/dashboard/kyc");
    await audit(tx, admin.id, `VERIFY_${status}`, "TutorProfile", p.id, { note });
  });
}
