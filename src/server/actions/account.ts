"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import type { ActionResult } from "../errors";
import { DomainError } from "../errors";
import { requireUser } from "../auth";
import { formToObject, lmsShareSchema, sessionLogSchema, tutorProfileSchema } from "../validation";
import { recordKycDocument, submitForVerification, upsertTutorProfile } from "../services/tutors";
import { addReview, confirmSalaryReceived, confirmSession, linkLmsStudent, logSession, recordSalary, shareLmsResource } from "../services/engagement";
import { createCreditPackInvoice, CREDIT_PACKS, startPayment } from "../services/billing";
import { createSslcommerzSession } from "../payments/sslcommerz";
import { createStripeCheckout } from "../payments/stripe";
import { run, str } from "./_run";

type State = ActionResult<unknown> | null;

// ───────── Profiles ─────────
export async function saveTutorProfileAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser(["TUTOR"]);
    const input = tutorProfileSchema.parse(formToObject(fd, ["subjects", "grades", "curricula", "tuitionTypes", "preferredCities", "preferredAreas"]));
    await upsertTutorProfile(user, input);
    revalidatePath("/dashboard");
  }, ["প্রোফাইল সংরক্ষণ হয়েছে।", "Profile saved."]);
}

const contactSchema = z.object({ fullName: z.string().trim().min(3).max(80), phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/) });
export async function saveContactAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser();
    const input = contactSchema.parse(formToObject(fd));
    await db.user.update({ where: { id: user.id }, data: input });
    revalidatePath("/dashboard");
  }, ["সংরক্ষণ হয়েছে।", "Saved."]);
}

// ───────── KYC (file already uploaded to the private bucket from the browser) ─────────
const kycSchema = z.object({
  type: z.enum(["NID", "PASSPORT", "STUDENT_ID", "EDUCATIONAL_CERTIFICATE", "PHOTO", "OTHER"]),
  storagePath: z.string().min(3).max(300),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
});
export async function recordKycAction(doc: z.infer<typeof kycSchema>) {
  return run(async () => {
    const user = await requireUser(["TUTOR"]);
    await recordKycDocument(user, kycSchema.parse(doc));
    revalidatePath("/dashboard/kyc");
  });
}

export async function submitKycAction(_: State, _fd: FormData) {
  return run(async () => {
    await submitForVerification(await requireUser(["TUTOR"]));
    revalidatePath("/dashboard/kyc");
  }, ["যাচাইয়ের জন্য জমা হয়েছে। সাধারণত ২৪–৪৮ ঘণ্টা লাগে।", "Submitted for verification — usually 24–48 hours."]);
}

// ───────── Running a tuition ─────────
export async function logSessionAction(_: State, fd: FormData) {
  return run(async () => {
    const input = sessionLogSchema.parse(formToObject(fd));
    await logSession(await requireUser(["TUTOR"]), input);
    revalidatePath(`/dashboard/tuitions/${input.agreementId}`);
  }, ["সেশন লগ হয়েছে।", "Session logged."]);
}

export async function confirmSessionAction(_: State, fd: FormData) {
  return run(async () => {
    await confirmSession(await requireUser(), str(fd, "sessionId"), str(fd, "feedback") || undefined, Number(str(fd, "rating")) || undefined);
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  });
}

export async function recordSalaryAction(_: State, fd: FormData) {
  return run(async () => {
    await recordSalary(await requireUser(), str(fd, "agreementId"), str(fd, "periodMonth"), Number(str(fd, "amount")), str(fd, "method") || undefined);
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  }, ["বেতন পরিশোধ রেকর্ড হয়েছে।", "Salary payment recorded."]);
}

export async function confirmSalaryAction(_: State, fd: FormData) {
  return run(async () => {
    await confirmSalaryReceived(await requireUser(["TUTOR"]), str(fd, "salaryId"));
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  });
}

export async function reviewAction(_: State, fd: FormData) {
  return run(async () => {
    await addReview(await requireUser(), str(fd, "agreementId"), Number(str(fd, "rating")), str(fd, "comment") || undefined);
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  }, ["রিভিউ দেওয়ার জন্য ধন্যবাদ!", "Thanks for your review!"]);
}

export async function shareLmsAction(_: State, fd: FormData) {
  return run(async () => {
    const input = lmsShareSchema.parse(formToObject(fd));
    await shareLmsResource(await requireUser(["TUTOR"]), input);
    revalidatePath(`/dashboard/tuitions/${input.agreementId}`);
  }, ["শিক্ষার্থীর সাথে শেয়ার হয়েছে।", "Shared with the student."]);
}

export async function linkLmsAction(_: State, fd: FormData) {
  return run(async () => {
    await linkLmsStudent(await requireUser(), str(fd, "agreementId"), str(fd, "lmsStudentId"));
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  }, ["LMS অ্যাকাউন্ট যুক্ত হয়েছে।", "LMS account linked."]);
}

// ───────── Payments ─────────
export async function payInvoiceAction(_: State, fd: FormData): Promise<ActionResult<{ url: string }>> {
  const res = await run(async () => {
    const user = await requireUser();
    const provider = str(fd, "provider") === "STRIPE" ? "STRIPE" : "SSLCOMMERZ";
    const { invoice, txn } = await startPayment(user, str(fd, "invoiceId"), provider);
    const common = { tranId: txn.tranId, amount: Number(invoice.amount).toFixed(2), currency: invoice.currency, invoiceNumber: invoice.invoiceNumber };
    const url = provider === "STRIPE"
      ? await createStripeCheckout({ ...common, email: user.email })
      : await createSslcommerzSession({ ...common, customer: { name: user.fullName, email: user.email, phone: user.phone } });
    return { url };
  });
  if (res.ok && res.data) redirect(res.data.url);
  return res;
}

export async function buyCreditsAction(_: State, fd: FormData) {
  return run(async () => {
    const pack = CREDIT_PACKS[Number(str(fd, "pack"))];
    if (!pack) throw new DomainError("VALIDATION");
    await createCreditPackInvoice(await requireUser(["TUTOR"]), pack);
    revalidatePath("/dashboard/invoices");
  }, ["ইনভয়েস তৈরি হয়েছে — পেমেন্ট করলে ক্রেডিট যোগ হবে।", "Invoice created — credits are added once it's paid."]);
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard");
}

export async function setLanguageAction(lang: "bn" | "en", path: string) {
  const { cookies } = await import("next/headers");
  (await cookies()).set("lang", lang === "en" ? "en" : "bn", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect(path.startsWith("/") ? path : "/");
}
