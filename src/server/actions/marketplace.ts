"use server";

/**
 * Server Actions for the hiring funnel: post → apply → shortlist → trial → hire (agreement) → sign.
 * Every action re-authenticates (never trusts the client), validates with zod, then calls a service
 * whose transactional logic is covered by scripts/test-workflow.ts.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "../errors";
import { requireUser } from "../auth";
import { applySchema, createPostSchema, formToObject, hireSchema, signatureSchema, trialSchema } from "../validation";
import { cancelTuitionPost, createTuitionPost } from "../services/posts";
import { applyToTuition, rejectApplicant, removeFromShortlist, shortlistApplicant, withdrawApplication } from "../services/applications";
import { cancelPendingAgreement, endAgreement, hireAndGenerateAgreement, scheduleTrial, signAgreementAsTutor, updateTrialOutcome } from "../services/hiring";
import { clientIp, run, str } from "./_run";

type State = ActionResult<unknown> | null;

// ───────── Guardian: post a tuition ─────────
export async function createTuitionAction(_: State, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const res = await run(async () => {
    const user = await requireUser(["STUDENT_GUARDIAN"]);
    const input = createPostSchema.parse(formToObject(fd, ["subjects"]));
    return createTuitionPost(user, input);
  });
  if (res.ok && res.data) {
    revalidatePath("/tuitions");
    redirect(`/dashboard/jobs/${res.data.id}/applicants?created=1`);
  }
  return res;
}

export async function cancelTuitionAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser();
    await cancelTuitionPost(user, str(fd, "postId"));
    revalidatePath("/dashboard/jobs");
  }, ["টিউশন বাতিল করা হয়েছে।", "Tuition cancelled."]);
}

// ───────── Tutor: apply with a custom pitch ─────────
export async function applyAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser(["TUTOR"]);
    const input = applySchema.parse(formToObject(fd));
    await applyToTuition(user, input);
    revalidatePath("/tuitions");
    revalidatePath("/dashboard/applications");
  }, ["আবেদন জমা হয়েছে! অভিভাবক শর্টলিস্ট করলে জানানো হবে।", "Application sent! You'll be notified if the guardian shortlists you."]);
}

export async function withdrawAction(_: State, fd: FormData) {
  return run(async () => {
    await withdrawApplication(await requireUser(["TUTOR"]), str(fd, "applicationId"));
    revalidatePath("/dashboard/applications");
  }, ["আবেদন প্রত্যাহার করা হয়েছে।", "Application withdrawn."]);
}

// ───────── Guardian: review & shortlist ─────────
function revalidateJob(fd: FormData) {
  revalidatePath(`/dashboard/jobs/${str(fd, "postId")}/applicants`);
}

export async function shortlistAction(_: State, fd: FormData) {
  return run(async () => {
    const r = await shortlistApplicant(await requireUser(["STUDENT_GUARDIAN"]), str(fd, "applicationId"), str(fd, "note") || undefined);
    revalidateJob(fd);
    return r;
  }, ["শর্টলিস্টে যোগ হয়েছে।", "Added to shortlist."]);
}

export async function unshortlistAction(_: State, fd: FormData) {
  return run(async () => {
    await removeFromShortlist(await requireUser(["STUDENT_GUARDIAN"]), str(fd, "applicationId"));
    revalidateJob(fd);
  });
}

export async function rejectAction(_: State, fd: FormData) {
  return run(async () => {
    await rejectApplicant(await requireUser(["STUDENT_GUARDIAN"]), str(fd, "applicationId"), str(fd, "reason") || undefined);
    revalidateJob(fd);
  });
}

// ───────── Trial class ─────────
export async function scheduleTrialAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser(["STUDENT_GUARDIAN"]);
    // <input type="datetime-local"> has no timezone → interpret as Asia/Dhaka (UTC+6, no DST)
    const obj = formToObject(fd);
    if (typeof obj.scheduledAt === "string" && !obj.scheduledAt.endsWith("Z")) obj.scheduledAt = `${obj.scheduledAt}:00+06:00`;
    const t = await scheduleTrial(user, trialSchema.parse(obj));
    revalidateJob(fd);
    return { meetingLink: t.meetingLink };
  }, ["ট্রায়াল ক্লাস নির্ধারিত হয়েছে, শিক্ষককে জানানো হয়েছে।", "Trial class scheduled — the tutor has been notified."]);
}

export async function trialOutcomeAction(_: State, fd: FormData) {
  return run(async () => {
    const user = await requireUser();
    const rating = Number(str(fd, "rating")) || undefined;
    await updateTrialOutcome(user, str(fd, "trialId"), { status: str(fd, "status") as "COMPLETED" | "CANCELLED" | "NO_SHOW", feedback: str(fd, "feedback") || undefined, rating });
    revalidateJob(fd);
    revalidatePath("/dashboard/applications");
  });
}

// ───────── Hire: generate & sign the digital agreement ─────────
export async function hireAction(_: State, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const res = await run(async () => {
    const user = await requireUser(["STUDENT_GUARDIAN"]);
    const input = hireSchema.parse(formToObject(fd));
    return hireAndGenerateAgreement(user, input, await clientIp());
  });
  if (res.ok && res.data) redirect(`/dashboard/agreements/${res.data.id}?generated=1`);
  return res;
}

export async function signAgreementAction(_: State, fd: FormData) {
  const res = await run(async () => {
    const user = await requireUser(["TUTOR"]);
    const { signature } = signatureSchema.parse(formToObject(fd));
    return signAgreementAsTutor(user, str(fd, "agreementId"), signature, await clientIp());
  });
  if (res.ok) {
    revalidatePath("/dashboard");
    redirect(`/dashboard/agreements/${str(fd, "agreementId")}?signed=1`);
  }
  return res;
}

export async function cancelAgreementAction(_: State, fd: FormData) {
  return run(async () => {
    await cancelPendingAgreement(await requireUser(), str(fd, "agreementId"), str(fd, "reason") || undefined);
    revalidatePath(`/dashboard/agreements/${str(fd, "agreementId")}`);
  }, ["চুক্তি প্রত্যাহার করা হয়েছে।", "Agreement withdrawn."]);
}

export async function endAgreementAction(_: State, fd: FormData) {
  return run(async () => {
    const kind = str(fd, "kind") === "COMPLETED" ? "COMPLETED" : "TERMINATED";
    await endAgreement(await requireUser(), str(fd, "agreementId"), kind, str(fd, "reason") || kind);
    revalidatePath(`/dashboard/tuitions/${str(fd, "agreementId")}`);
  });
}
