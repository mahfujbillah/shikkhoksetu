"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "../errors";
import { DomainError } from "../errors";
import { requireAdmin } from "../auth";
import { cancelPendingAgreement, endAgreement } from "../services/hiring";
import { grantCredits } from "../services/admin";
import {
  addNote, adminSetApplicationStatus, adminUpdatePost, adminUpdateUser, deleteReview, forceVerification,
  NOTE_ENTITIES, reopenPost, sendAnnouncement, type Audience, type NoteEntity,
} from "../services/crm";
import { run, str } from "./_run";

type State = ActionResult<unknown> | null;
const num = (fd: FormData, k: string) => { const v = str(fd, k).trim(); return v === "" ? null : Number(v); };
const back = (fd: FormData) => { const p = str(fd, "back"); if (p.startsWith("/admin")) revalidatePath(p); revalidatePath("/admin", "layout"); };

export async function updateUserAction(_: State, fd: FormData) {
  return run(async () => {
    await adminUpdateUser(await requireAdmin(), str(fd, "userId"), { fullName: str(fd, "fullName"), phone: str(fd, "phone").trim() || null, lmsUserId: str(fd, "lmsUserId").trim() || null });
    back(fd);
  }, ["সংরক্ষণ হয়েছে।", "Saved."]);
}

export async function adjustCreditsAction(_: State, fd: FormData) {
  return run(async () => {
    const n = num(fd, "credits");
    if (n == null || !Number.isInteger(n) || n === 0 || Math.abs(n) > 10000) throw new DomainError("VALIDATION");
    await grantCredits(await requireAdmin(), str(fd, "tutorProfileId"), n);
    back(fd);
  }, ["ক্রেডিট আপডেট হয়েছে।", "Credits updated."]);
}

export async function forceVerifyAction(_: State, fd: FormData) {
  return run(async () => {
    await forceVerification(await requireAdmin({ superOnly: true }), str(fd, "tutorProfileId"), str(fd, "status") as "VERIFIED" | "UNVERIFIED" | "REJECTED", str(fd, "note") || undefined);
    back(fd);
  }, ["আপডেট হয়েছে।", "Updated."]);
}

export async function updatePostAction(_: State, fd: FormData) {
  return run(async () => {
    await adminUpdatePost(await requireAdmin(), str(fd, "postId"), {
      title: str(fd, "title"), budgetMax: Number(str(fd, "budgetMax")), budgetMin: num(fd, "budgetMin"), daysPerWeek: Number(str(fd, "daysPerWeek")),
      requirements: str(fd, "requirements").trim() || null, addressLine: str(fd, "addressLine").trim() || null, maxShortlist: Number(str(fd, "maxShortlist")),
    });
    back(fd);
  }, ["সংরক্ষণ হয়েছে।", "Saved."]);
}

export async function reopenPostAction(_: State, fd: FormData) {
  return run(async () => { await reopenPost(await requireAdmin(), str(fd, "postId")); back(fd); }, ["আবার খোলা হয়েছে।", "Re-opened."]);
}

export async function applicationStatusAction(_: State, fd: FormData) {
  return run(async () => {
    await adminSetApplicationStatus(await requireAdmin(), str(fd, "applicationId"), str(fd, "to") === "PENDING" ? "PENDING" : "REJECTED", str(fd, "reason") || undefined);
    back(fd);
  });
}

export async function adminAgreementAction(_: State, fd: FormData) {
  return run(async () => {
    const admin = await requireAdmin();
    const kind = str(fd, "kind");
    const reason = str(fd, "reason").trim() || "Closed by admin";
    if (kind === "CANCEL") await cancelPendingAgreement(admin, str(fd, "agreementId"), reason);
    else if (kind === "COMPLETED" || kind === "TERMINATED") await endAgreement(admin, str(fd, "agreementId"), kind, reason);
    else throw new DomainError("VALIDATION");
    back(fd);
  }, ["আপডেট হয়েছে।", "Updated."]);
}

export async function deleteReviewAction(_: State, fd: FormData) {
  return run(async () => { await deleteReview(await requireAdmin({ superOnly: true }), str(fd, "reviewId")); back(fd); }, ["রিভিউ মুছে ফেলা হয়েছে।", "Review deleted."]);
}

export async function addNoteAction(_: State, fd: FormData) {
  return run(async () => {
    const entity = str(fd, "entity") as NoteEntity;
    if (!NOTE_ENTITIES.includes(entity)) throw new DomainError("VALIDATION");
    await addNote(await requireAdmin(), entity, str(fd, "entityId"), str(fd, "text"));
    back(fd);
  }, ["নোট যোগ হয়েছে।", "Note added."]);
}

export async function announceAction(_: State, fd: FormData) {
  return run(async () => {
    const a = str(fd, "audience");
    const audience: Audience =
      a === "ALL" ? { kind: "ALL" }
      : a === "VERIFIED_TUTORS" ? { kind: "VERIFIED_TUTORS" }
      : a === "TUTOR" || a === "STUDENT_GUARDIAN" || a === "ADMIN" ? { kind: "ROLE", role: a }
      : a === "USER" && str(fd, "userId") ? { kind: "USER", userId: str(fd, "userId") }
      : (() => { throw new DomainError("VALIDATION"); })();
    const n = await sendAnnouncement(await requireAdmin(), audience, str(fd, "title"), str(fd, "body").trim() || null, str(fd, "link").trim() || null);
    back(fd);
    return { sent: n };
  }, ["পাঠানো হয়েছে।", "Sent."]);
}
