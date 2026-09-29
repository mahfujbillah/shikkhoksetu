"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { supabaseServer } from "@/lib/supabase-server";
import type { ActionResult } from "../errors";
import { requireAdmin } from "../auth";
import { reviewKycDocument, setTutorVerification } from "../services/tutors";
import { grantCredits, setUserBlocked, setUserRole, updateSettings } from "../services/admin";
import { recordManualPayment, voidInvoice } from "../services/billing";
import { cancelTuitionPost } from "../services/posts";
import { run, str } from "./_run";

type State = ActionResult<unknown> | null;

export async function reviewKycAction(_: State, fd: FormData) {
  return run(async () => {
    await reviewKycDocument(await requireAdmin(), str(fd, "docId"), str(fd, "decision") === "approve", str(fd, "reason") || undefined);
    revalidatePath("/admin/kyc");
  });
}

export async function setVerificationAction(_: State, fd: FormData) {
  return run(async () => {
    const status = str(fd, "status") as "VERIFIED" | "REJECTED" | "UNVERIFIED";
    await setTutorVerification(await requireAdmin(), str(fd, "tutorProfileId"), status, str(fd, "note") || undefined);
    revalidatePath("/admin/kyc");
  }, ["আপডেট হয়েছে।", "Updated."]);
}

/** Short-lived signed URL for a private KYC file, created with the admin's own session (Storage RLS allows admins). */
export async function kycFileUrlAction(docId: string) {
  return run(async () => {
    await requireAdmin();
    const doc = await db.kycDocument.findUniqueOrThrow({ where: { id: docId } });
    const supabase = await supabaseServer();
    const { data, error } = await supabase.storage.from("kyc").createSignedUrl(doc.storagePath, 120);
    if (error || !data) throw new Error(error?.message ?? "signing failed");
    return { url: data.signedUrl };
  });
}

export async function setRoleAction(_: State, fd: FormData) {
  return run(async () => {
    await setUserRole(await requireAdmin({ superOnly: true }), str(fd, "userId"), str(fd, "role") as "STUDENT_GUARDIAN" | "TUTOR" | "ADMIN");
    revalidatePath("/admin/users");
  }, ["ভূমিকা বদলানো হয়েছে।", "Role updated."]);
}

export async function setBlockedAction(_: State, fd: FormData) {
  return run(async () => {
    await setUserBlocked(await requireAdmin(), str(fd, "userId"), str(fd, "blocked") === "true");
    revalidatePath("/admin/users");
  });
}

export async function settingsAction(_: State, fd: FormData) {
  return run(async () => {
    await updateSettings(await requireAdmin({ superOnly: true }), {
      monetizationMode: str(fd, "monetizationMode") as "COMMISSION" | "CREDITS" | "HYBRID",
      commissionRate: Number(str(fd, "commissionRate")),
      commissionPayer: str(fd, "commissionPayer") as "TUTOR" | "GUARDIAN",
      applyCreditCost: Number(str(fd, "applyCreditCost")),
      maxShortlist: Number(str(fd, "maxShortlist")),
      invoiceDueDays: Number(str(fd, "invoiceDueDays")),
    });
    revalidatePath("/admin/settings");
  }, ["সেটিংস সংরক্ষণ হয়েছে।", "Settings saved."]);
}

export async function manualPaymentAction(_: State, fd: FormData) {
  return run(async () => {
    await recordManualPayment(await requireAdmin(), str(fd, "invoiceId"), str(fd, "reference") || "manual");
    revalidatePath("/admin/invoices");
  }, ["পরিশোধিত হিসেবে চিহ্নিত।", "Marked as paid."]);
}

export async function voidInvoiceAction(_: State, fd: FormData) {
  return run(async () => {
    await voidInvoice(await requireAdmin(), str(fd, "invoiceId"), str(fd, "reason") || "Voided by admin");
    revalidatePath("/admin/invoices");
  });
}

export async function grantCreditsAction(_: State, fd: FormData) {
  return run(async () => {
    await grantCredits(await requireAdmin(), str(fd, "tutorProfileId"), Number(str(fd, "credits")));
    revalidatePath("/admin/users");
  }, ["ক্রেডিট যোগ হয়েছে।", "Credits granted."]);
}

export async function adminCancelPostAction(_: State, fd: FormData) {
  return run(async () => {
    await cancelTuitionPost(await requireAdmin(), str(fd, "postId"));
    revalidatePath("/admin/tuitions");
  });
}
