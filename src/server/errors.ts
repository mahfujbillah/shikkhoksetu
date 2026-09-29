/**
 * Domain errors carry a stable machine code. Services throw them; Server Actions convert them
 * into a serialisable ActionResult with a bilingual message (see toActionError).
 */
export const ERROR_MESSAGES = {
  UNAUTHENTICATED: ["অনুগ্রহ করে আগে লগইন করুন।", "Please log in first."],
  FORBIDDEN: ["এই কাজের অনুমতি আপনার নেই।", "You are not allowed to do this."],
  BLOCKED: ["আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ। সাপোর্টে যোগাযোগ করুন।", "Your account is suspended. Please contact support."],
  VALIDATION: ["কিছু তথ্য ঠিক নেই, আবার দেখুন।", "Some fields need attention."],
  NOT_FOUND: ["খুঁজে পাওয়া যায়নি।", "Not found."],
  PROFILE_REQUIRED: ["আগে শিক্ষক প্রোফাইল পূরণ করুন।", "Please complete your tutor profile first."],
  TUTOR_NOT_VERIFIED: ["শুধু যাচাইকৃত শিক্ষকরা আবেদন করতে পারেন। KYC ডকুমেন্ট জমা দিন।", "Only verified tutors can apply. Please submit your KYC documents."],
  JOB_CLOSED: ["এই টিউশনে আর আবেদন নেওয়া হচ্ছে না।", "This tuition is no longer accepting applications."],
  OWN_JOB: ["নিজের পোস্টে আবেদন করা যায় না।", "You cannot apply to your own post."],
  DUPLICATE_APPLICATION: ["আপনি এই টিউশনে আগেই আবেদন করেছেন।", "You have already applied to this tuition."],
  GENDER_MISMATCH: ["অভিভাবক ভিন্ন লিঙ্গের শিক্ষক চেয়েছেন।", "The guardian asked for a tutor of a different gender."],
  INSUFFICIENT_CREDITS: ["আবেদনের জন্য যথেষ্ট ক্রেডিট নেই।", "Not enough credits to apply."],
  SHORTLIST_FULL: ["শর্টলিস্ট পূর্ণ হয়ে গেছে।", "The shortlist is full."],
  INVALID_STATE: ["এই অবস্থায় কাজটি করা যাবে না।", "This action isn't possible in the current state."],
  ALREADY_HIRING: ["এই টিউশনের জন্য ইতিমধ্যে একটি চুক্তি চলমান।", "An agreement for this tuition is already in progress."],
  SIGNATURE_REQUIRED: ["চুক্তিতে সম্মতি দিয়ে নিজের পূর্ণ নাম লিখে স্বাক্ষর করুন।", "Tick the consent box and type your full name to sign."],
  KYC_INCOMPLETE: ["পরিচয়পত্র (NID/পাসপোর্ট) এবং শিক্ষাগত ডকুমেন্ট দুটোই লাগবে।", "An identity document (NID/Passport) and an education document are both required."],
  PAYMENT_NOT_CONFIGURED: ["এই পেমেন্ট পদ্ধতি এখনো চালু হয়নি।", "This payment method is not configured yet."],
  PAYMENT_FAILED: ["পেমেন্ট সম্পন্ন হয়নি।", "The payment could not be completed."],
  CONFLICT: ["অন্য কেউ একই সময়ে পরিবর্তন করেছে, আবার চেষ্টা করুন।", "Someone else changed this at the same time — please retry."],
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export class DomainError extends Error {
  constructor(public readonly code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code][1]);
    this.name = "DomainError";
  }
}

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; code: ErrorCode | "UNKNOWN"; error: string; fieldErrors?: FieldErrors };

/** Is this a Prisma unique-constraint violation (P2002)? Works for driver-adapter errors too. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}
