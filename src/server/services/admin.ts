import "server-only";
import { db } from "@/lib/db";
import type { CommissionPayer, MonetizationMode, UserRole } from "@/generated/prisma/enums";
import type { SessionUser } from "../auth";
import { DomainError } from "../errors";
import { audit, D, transaction } from "./common";

/** Only the super admin changes roles; nobody (not even super admin) can demote/block a super admin. */
export async function setUserRole(actor: SessionUser, userId: string, role: UserRole) {
  if (!actor.isSuperAdmin) throw new DomainError("FORBIDDEN");
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new DomainError("NOT_FOUND");
    if (target.isSuperAdmin) throw new DomainError("FORBIDDEN", "The super admin's role cannot be changed");
    await tx.user.update({ where: { id: userId }, data: { role } });
    await audit(tx, actor.id, "USER_ROLE", "User", userId, { from: target.role, to: role });
  });
}

export async function setUserBlocked(actor: SessionUser, userId: string, blocked: boolean) {
  if (actor.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new DomainError("NOT_FOUND");
    if (target.isSuperAdmin || (target.role === "ADMIN" && !actor.isSuperAdmin)) throw new DomainError("FORBIDDEN");
    await tx.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
    await audit(tx, actor.id, blocked ? "USER_BLOCK" : "USER_UNBLOCK", "User", userId);
  });
}

export async function updateSettings(actor: SessionUser, s: { monetizationMode: MonetizationMode; commissionRate: number; commissionPayer: CommissionPayer; applyCreditCost: number; maxShortlist: number; invoiceDueDays: number }) {
  if (!actor.isSuperAdmin) throw new DomainError("FORBIDDEN");
  if (s.commissionRate < 0 || s.commissionRate > 100 || s.maxShortlist < 1 || s.maxShortlist > 10 || s.applyCreditCost < 0 || s.invoiceDueDays < 1) throw new DomainError("VALIDATION");
  return transaction(async (tx) => {
    await tx.platformSetting.upsert({ where: { id: 1 }, update: { ...s, commissionRate: D(s.commissionRate) }, create: { id: 1, ...s, commissionRate: D(s.commissionRate) } });
    await audit(tx, actor.id, "SETTINGS_UPDATE", "PlatformSetting", "1", s);
  });
}

export async function grantCredits(actor: SessionUser, tutorProfileId: string, credits: number) {
  if (actor.role !== "ADMIN" || !Number.isInteger(credits) || credits === 0) throw new DomainError("VALIDATION");
  return transaction(async (tx) => {
    const res = await tx.tutorProfile.updateMany({ where: { id: tutorProfileId, creditBalance: { gte: Math.max(0, -credits) } }, data: { creditBalance: { increment: credits } } });
    if (res.count !== 1) throw new DomainError("INVALID_STATE");
    await tx.creditLedger.create({ data: { tutorProfileId, delta: credits, reason: "ADMIN_GRANT" } });
    await audit(tx, actor.id, "CREDIT_GRANT", "TutorProfile", tutorProfileId, { credits });
  });
}

export async function adminOverview() {
  const [users, tutors, verified, pendingKyc, openPosts, activeAgreements, unpaid, paidSum] = await Promise.all([
    db.user.count(),
    db.tutorProfile.count(),
    db.tutorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    db.tutorProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.tuitionPost.count({ where: { status: { in: ["OPEN", "SHORTLISTED"] } } }),
    db.tuitionAgreement.count({ where: { status: "ACTIVE" } }),
    db.invoice.count({ where: { status: { in: ["ISSUED", "OVERDUE"] } } }),
    db.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);
  return { users, tutors, verified, pendingKyc, openPosts, activeAgreements, unpaid, revenue: Number(paidSum._sum.amount ?? 0) };
}
