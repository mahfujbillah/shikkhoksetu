import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Curriculum, TuitionType } from "@/generated/prisma/enums";
import type { SessionUser } from "../auth";
import { DomainError } from "../errors";
import type { CreatePostInput } from "../validation";
import { audit, getSettings, lockRow, transaction } from "./common";

/** Guardian publishes a tuition requirement. Their phone is saved to the profile (private until hire). */
export async function createTuitionPost(user: SessionUser, input: CreatePostInput) {
  if (user.role !== "STUDENT_GUARDIAN" && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  const settings = await getSettings();
  const online = input.tuitionType === "ONLINE_ONE_TO_ONE";

  return transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { phone: input.phone } });
    return tx.tuitionPost.create({
      data: {
        guardianId: user.id,
        title: input.title,
        studentName: input.studentName,
        studentGender: input.studentGender,
        studentsCount: input.tuitionType === "GROUP_BATCH" ? input.studentsCount : 1,
        grade: input.grade,
        curriculum: input.curriculum,
        subjects: input.subjects,
        tuitionType: input.tuitionType,
        daysPerWeek: input.daysPerWeek,
        sessionMinutes: input.sessionMinutes,
        preferredTime: input.preferredTime,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        salaryNegotiable: input.salaryNegotiable,
        genderPreference: input.genderPreference,
        isOnline: online,
        city: online ? null : input.city,
        area: online ? null : input.area,
        addressLine: online ? null : input.addressLine,
        requirements: input.requirements,
        startDate: input.startDate,
        maxShortlist: settings.maxShortlist,
      },
      select: { id: true, number: true },
    });
  });
}

export type BoardFilters = {
  q?: string;
  subject?: string;
  grade?: string;
  curriculum?: Curriculum;
  type?: TuitionType;
  city?: string;
  area?: string;
  online?: boolean;
  minSalary?: number;
  maxSalary?: number;
  gender?: "MALE" | "FEMALE";
  sort?: "new" | "salary";
  page?: number;
};

export const PAGE_SIZE = 12;

/** Public job board query — never selects private columns (addressLine, guardian phone). */
export async function listOpenTuitions(f: BoardFilters) {
  const where: Prisma.TuitionPostWhereInput = { status: { in: ["OPEN", "SHORTLISTED"] } };
  if (f.subject) where.subjects = { has: f.subject };
  if (f.grade) where.grade = f.grade;
  if (f.curriculum) where.curriculum = f.curriculum;
  if (f.type) where.tuitionType = f.type;
  if (f.online) where.isOnline = true;
  else if (f.city) {
    where.city = f.city;
    if (f.area) where.area = f.area;
  }
  if (f.minSalary) where.budgetMax = { gte: f.minSalary };
  if (f.maxSalary) where.OR = [{ budgetMin: { lte: f.maxSalary } }, { budgetMin: null, budgetMax: { lte: f.maxSalary } }];
  if (f.gender) where.genderPreference = { in: ["ANY", f.gender] };
  if (f.q) where.AND = [{ OR: [{ title: { contains: f.q, mode: "insensitive" } }, { requirements: { contains: f.q, mode: "insensitive" } }] }];

  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    db.tuitionPost.findMany({
      where,
      orderBy: f.sort === "salary" ? [{ budgetMax: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: PUBLIC_POST_SELECT,
    }),
    db.tuitionPost.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const PUBLIC_POST_SELECT = {
  id: true, number: true, title: true, grade: true, curriculum: true, subjects: true, tuitionType: true,
  daysPerWeek: true, sessionMinutes: true, preferredTime: true, budgetMin: true, budgetMax: true, salaryNegotiable: true,
  genderPreference: true, isOnline: true, city: true, area: true, requirements: true, startDate: true,
  studentsCount: true, studentGender: true, status: true, applicationsCount: true, createdAt: true, guardianId: true,
} satisfies Prisma.TuitionPostSelect;

export type PublicPost = Prisma.TuitionPostGetPayload<{ select: typeof PUBLIC_POST_SELECT }>;

export function getPublicPost(id: string) {
  return db.tuitionPost.findUnique({ where: { id }, select: PUBLIC_POST_SELECT });
}

/** Guardian (or admin) cancels an unfilled job. Pending applications are closed with a reason. */
export async function cancelTuitionPost(user: SessionUser, postId: string) {
  return transaction(async (tx) => {
    if (!(await lockRow(tx, "tuition_posts", postId))) throw new DomainError("NOT_FOUND");
    const post = await tx.tuitionPost.findUniqueOrThrow({ where: { id: postId } });
    if (post.guardianId !== user.id && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    if (post.status === "CONFIRMED" || post.status === "CANCELLED") throw new DomainError("INVALID_STATE");
    const live = await tx.tuitionAgreement.count({ where: { postId, status: "PENDING_SIGNATURES" } });
    if (live) throw new DomainError("ALREADY_HIRING");

    await tx.tuitionPost.update({ where: { id: postId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.tuitionApplication.updateMany({
      where: { postId, status: { in: ["PENDING", "SHORTLISTED"] } },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: "Job cancelled by guardian" },
    });
    await audit(tx, user.id, "POST_CANCEL", "TuitionPost", postId);
  });
}
