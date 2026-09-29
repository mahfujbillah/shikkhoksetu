import { z } from "zod";
import { isArea, isCity, isGrade, isSubject } from "@/lib/catalog";

/** Shared zod schemas. FormData arrives as strings, so we coerce and trim here. */

const money = z.coerce.number().int().min(500, "Minimum ৳500").max(500_000);
const optionalMoney = z.preprocess((v) => (v === "" || v == null ? undefined : v), money.optional());
const optionalText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const phone = z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");

export const CURRICULUM = z.enum(["BANGLA_MEDIUM", "ENGLISH_VERSION", "ENGLISH_MEDIUM_CAMBRIDGE", "ENGLISH_MEDIUM_EDEXCEL", "INTERNATIONAL_BACCALAUREATE", "MADRASAH_ALIA", "MADRASAH_QAWMI", "OTHER"]);
export const TUITION_TYPE = z.enum(["HOME", "ONLINE_ONE_TO_ONE", "GROUP_BATCH"]);
export const GENDER = z.enum(["MALE", "FEMALE"]);

export const createPostSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    studentName: optionalText(80),
    studentGender: z.preprocess((v) => (v === "" ? undefined : v), GENDER.optional()),
    studentsCount: z.coerce.number().int().min(1).max(30).default(1),
    grade: z.string().refine(isGrade, "Choose a class"),
    curriculum: CURRICULUM,
    subjects: z.array(z.string().refine(isSubject)).min(1, "Pick at least one subject").max(8),
    tuitionType: TUITION_TYPE,
    daysPerWeek: z.coerce.number().int().min(1).max(7),
    sessionMinutes: z.coerce.number().int().min(30).max(240).default(60),
    preferredTime: optionalText(60),
    budgetMin: optionalMoney,
    budgetMax: money,
    salaryNegotiable: z.coerce.boolean().default(false),
    genderPreference: z.enum(["ANY", "MALE", "FEMALE"]).default("ANY"),
    city: optionalText(40),
    area: optionalText(40),
    addressLine: optionalText(200),
    requirements: optionalText(1500),
    startDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
    phone,
  })
  .superRefine((v, ctx) => {
    const online = v.tuitionType === "ONLINE_ONE_TO_ONE";
    if (!online) {
      if (!v.city || !isCity(v.city)) ctx.addIssue({ code: "custom", path: ["city"], message: "Choose a city for home / batch tuition" });
      else if (!v.area || !isArea(v.city, v.area)) ctx.addIssue({ code: "custom", path: ["area"], message: "Choose an area" });
    }
    if (v.budgetMin && v.budgetMin > v.budgetMax) ctx.addIssue({ code: "custom", path: ["budgetMin"], message: "Minimum can't exceed maximum" });
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const applySchema = z.object({
  postId: z.string().min(1),
  coverNote: z.string().trim().min(60, "Write at least 60 characters about why you're a great fit").max(2000),
  proposedSalary: optionalMoney,
  availability: optionalText(120),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const tutorProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phone,
  gender: GENDER,
  headline: optionalText(120),
  bio: optionalText(2000),
  university: z.string().trim().min(2).max(120),
  department: optionalText(120),
  degree: optionalText(120),
  graduationYear: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1970).max(2040).optional()),
  currentlyStudying: z.coerce.boolean().default(false),
  experienceYears: z.coerce.number().int().min(0).max(50).default(0),
  monthlyRate: optionalMoney,
  hourlyRate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(100).max(20_000).optional()),
  subjects: z.array(z.string().refine(isSubject)).min(1, "Pick at least one subject"),
  grades: z.array(z.string().refine(isGrade)).min(1, "Pick at least one class"),
  curricula: z.array(CURRICULUM).min(1, "Pick at least one curriculum"),
  tuitionTypes: z.array(TUITION_TYPE).min(1, "Pick at least one tutoring type"),
  preferredCities: z.array(z.string().refine(isCity)).default([]),
  preferredAreas: z.array(z.string()).default([]),
  maxDaysPerWeek: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(7).optional()),
});
export type TutorProfileInput = z.infer<typeof tutorProfileSchema>;

export const signatureSchema = z.object({
  signature: z.string().trim().min(3, "Type your full name").max(80),
  consent: z.preprocess((v) => v === true || v === "on" || v === "true", z.literal(true, { message: "You must accept the terms" })),
});

export const hireSchema = signatureSchema.extend({
  applicationId: z.string().min(1),
  monthlySalary: money,
  startDate: z.coerce.date(),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  sessionMinutes: z.coerce.number().int().min(30).max(240),
  specialTerms: optionalText(1500),
});
export type HireInput = z.infer<typeof hireSchema>;

export const trialSchema = z
  .object({
    applicationId: z.string().min(1),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
    mode: z.enum(["ONLINE_LMS", "ONLINE_MEET", "IN_PERSON"]),
    meetingLink: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().startsWith("https://").optional()),
    location: optionalText(200),
    isPaid: z.coerce.boolean().default(false),
    fee: optionalMoney,
  })
  .superRefine((v, ctx) => {
    if (v.scheduledAt.getTime() < Date.now() + 30 * 60_000) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Pick a time at least 30 minutes from now" });
    if (v.isPaid && !v.fee) ctx.addIssue({ code: "custom", path: ["fee"], message: "Enter the trial fee" });
    if (v.mode === "IN_PERSON" && !v.location) ctx.addIssue({ code: "custom", path: ["location"], message: "Enter where the trial will happen" });
  });
export type TrialInput = z.infer<typeof trialSchema>;

export const sessionLogSchema = z.object({
  agreementId: z.string().min(1),
  date: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(10).max(300),
  status: z.enum(["COMPLETED", "MISSED", "CANCELLED", "RESCHEDULED"]).default("COMPLETED"),
  topicsCovered: optionalText(500),
  homework: optionalText(500),
  tutorNote: optionalText(500),
});

export const lmsShareSchema = z.object({
  agreementId: z.string().min(1),
  type: z.enum(["COURSE", "VIDEO", "ASSIGNMENT", "MATERIAL", "QUIZ"]),
  title: z.string().trim().min(3).max(150),
  url: z.string().url().startsWith("https://"),
  note: optionalText(500),
  dueDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
});

export const lmsProgressSchema = z.object({
  lmsStudentId: z.string().min(1).max(100),
  courseId: z.string().max(100).optional(),
  courseTitle: z.string().max(200).optional(),
  metric: z.string().min(1).max(60),
  value: z.number().finite(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/** Turn FormData into a plain object; keys ending in [] (or repeated) become arrays. */
export function formToObject(fd: FormData, arrayKeys: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v) => typeof v === "string") as string[];
    out[key] = arrayKeys.includes(key) ? values : values[values.length - 1];
  }
  for (const k of arrayKeys) out[k] ??= [];
  return out;
}
