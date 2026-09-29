"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, Send, ShieldAlert, Users } from "lucide-react";
import { MAX_APPLICANTS } from "@/lib/catalog";
import { formatNumber } from "@/lib/i18n";
import { applyAction } from "@/server/actions/marketplace";
import type { ActionResult } from "@/server/errors";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { AuthModal } from "./AuthForm";
import { Field, FormMessage, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";
import { toast } from "./Toaster";
import { cn } from "@/lib/utils";

export type ApplyViewer = {
  signedIn: boolean;
  userId?: string;
  role?: "STUDENT_GUARDIAN" | "TUTOR" | "ADMIN";
  verification?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | null;
  verificationNote?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  appliedPostIds: string[];
};

export type ApplyPost = { id: string; title: string; budgetMax: number; genderPreference: string; status: string; guardianId: string; applicationsCount: number };

/** "4/10 applied" meter. */
export function ApplicantMeter({ count, className }: { count: number; className?: string }) {
  const { t, lang } = useT();
  const pct = Math.min(100, (count / MAX_APPLICANTS) * 100);
  const full = count >= MAX_APPLICANTS;
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("flex items-center gap-1 text-xs font-medium", full ? "text-destructive" : "text-muted-foreground")}>
        <Users className="size-3.5" /> {formatNumber(count, lang)}/{formatNumber(MAX_APPLICANTS, lang)} {t("আবেদন করেছেন", "applied")}
      </p>
      <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={MAX_APPLICANTS} aria-valuenow={count} aria-label={t("আবেদনকারী", "Applicants")}>
        <div className={cn("h-full rounded-full", full ? "bg-destructive" : pct >= 70 ? "bg-accent" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Apply flow with role-based gating. The client only decides *which* prompt to show;
 * applyAction re-checks everything on the server (role, KYC, job state, cap, gender, duplicates).
 *
 *  signed out            → Auth modal (log in / sign up without leaving the page)
 *  not a tutor           → error toast
 *  no profile / not KYC-verified → dialog that blocks the form and links to profile / KYC upload
 *  already applied       → "Applied" state (client) + DUPLICATE_APPLICATION (server, unique index)
 */
export function ApplyDialog({ post, viewer, showMeter = false }: { post: ApplyPost; viewer: ApplyViewer; showMeter?: boolean }) {
  const { t } = useT();
  const pathname = usePathname();
  const sp = useSearchParams();
  const here = `${pathname}${sp.size ? `?${sp}` : ""}`;
  const [authOpen, setAuthOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [len, setLen] = useState(0);
  const [done, setDone] = useState(viewer.appliedPostIds.includes(post.id));
  const [count, setCount] = useState(post.applicationsCount);
  const [state, formAction] = useActionState<ActionResult<{ postId: string; applicationsCount: number }> | null, FormData>(applyAction, null);
  const handled = useRef<typeof state>(null);

  // Keep in sync when the server re-renders with fresher data (router.refresh / revalidatePath).
  useEffect(() => { setCount(post.applicationsCount); }, [post.applicationsCount]);
  useEffect(() => { if (viewer.appliedPostIds.includes(post.id)) setDone(true); }, [viewer.appliedPostIds, post.id]);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      setDone(true); setOpen(false);
      if (state.data) setCount(state.data.applicationsCount);
      toast.success(state.message ?? t("আবেদন জমা হয়েছে।", "Application sent."), { label: t("আমার আবেদন", "My applications"), href: "/dashboard/applications" });
    } else if (state.code === "DUPLICATE_APPLICATION") {
      setDone(true); setOpen(false); toast.info(state.error);
    } else if (state.code === "APPLICATIONS_FULL") {
      setCount((c) => Math.max(c, MAX_APPLICANTS)); setOpen(false); toast.error(state.error);
    } else if (state.code === "JOB_CLOSED" || state.code === "GENDER_MISMATCH" || state.code === "FORBIDDEN") {
      setOpen(false); toast.error(state.error);
    } else if (state.code === "UNAUTHENTICATED") {
      setOpen(false); setAuthOpen(true);
    }
  }, [state, t]);

  const meter = showMeter ? <ApplicantMeter count={count} /> : null;
  const wrap = (btn: React.ReactNode) => (showMeter ? <div className="flex w-full items-center justify-between gap-3">{meter}{btn}</div> : <>{btn}</>);

  if (done) return wrap(<span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success"><CheckCircle2 className="size-4" /> {t("আবেদন করেছেন", "Applied")}</span>);
  if (post.status !== "OPEN" && post.status !== "SHORTLISTED") return wrap(<span className="text-sm text-muted-foreground">{t("বন্ধ", "Closed")}</span>);
  if (viewer.userId === post.guardianId) return wrap(<Link href={`/dashboard/jobs/${post.id}/applicants`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("আবেদনকারী দেখুন", "View applicants")}</Link>);
  if (count >= MAX_APPLICANTS) return wrap(<Button size="sm" variant="outline" disabled><Lock /> {t("পূর্ণ", "Full")}</Button>);

  const blocker =
    viewer.role !== "TUTOR" ? null
    : viewer.verification == null ? { text: t("আবেদনের আগে শিক্ষক প্রোফাইল পূরণ করুন, তারপর KYC ডকুমেন্ট জমা দিন।", "Complete your tutor profile, then submit your KYC documents, before applying."), href: "/dashboard/profile", cta: t("প্রোফাইল পূরণ করুন", "Complete profile") }
    : viewer.verification === "PENDING" ? { text: t("আপনার KYC ডকুমেন্ট যাচাই চলছে। যাচাই শেষ হলেই আবেদন করতে পারবেন।", "Your KYC documents are under review — you can apply as soon as you're verified."), href: "/dashboard/kyc", cta: t("KYC অবস্থা দেখুন", "View KYC status") }
    : viewer.verification !== "VERIFIED" ? { text: `${t("শুধু যাচাইকৃত শিক্ষকরা আবেদন করতে পারেন। আপনার NID/পাসপোর্ট এবং শিক্ষাগত ডকুমেন্ট জমা দিন।", "Only verified tutors can apply. Submit your NID/passport and an education document.")}${viewer.verificationNote ? ` (${viewer.verificationNote})` : ""}`, href: "/dashboard/kyc", cta: t("ডকুমেন্ট জমা দিন", "Submit documents") }
    : null;

  function onApplyClick() {
    if (!viewer.signedIn) return setAuthOpen(true);
    if (viewer.role !== "TUTOR") {
      return toast.error(viewer.role === "ADMIN"
        ? t("অ্যাডমিন অ্যাকাউন্ট দিয়ে আবেদন করা যায় না। শিক্ষক অ্যাকাউন্টে লগইন করুন।", "Admin accounts can't apply. Log in with a tutor account.")
        : t("শুধু শিক্ষকরা আবেদন করতে পারেন। আপনি অভিভাবক/শিক্ষার্থী হিসেবে লগইন করেছেন।", "Only tutors can apply. You're logged in as a guardian/student."));
    }
    if (!blocker && post.genderPreference !== "ANY" && viewer.gender && viewer.gender !== post.genderPreference) {
      return toast.error(t("অভিভাবক ভিন্ন লিঙ্গের শিক্ষক চেয়েছেন।", "The guardian asked for a tutor of a different gender."));
    }
    setOpen(true);
  }

  return (
    <>
      {wrap(<Button size="sm" onClick={onApplyClick}><Send /> {t("আবেদন করুন", "Apply now")}</Button>)}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} next={here} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blocker ? t("আবেদনের আগে যাচাই দরকার", "Verification required") : t("আবেদন করুন", "Apply to this tuition")}</DialogTitle>
            <DialogDescription>{post.title}</DialogDescription>
          </DialogHeader>
          {blocker ? (
            <div className="rounded-xl border border-dashed border-accent bg-accent/10 p-4 text-sm">
              <p className="flex gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> {blocker.text}</p>
              <Link href={blocker.href} className={buttonVariants({ size: "sm", className: "mt-3" })}>{blocker.cta}</Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4" noValidate>
              <input type="hidden" name="postId" value={post.id} />
              <Field label={t("কেন আপনি এই শিক্ষার্থীর জন্য সেরা?", "Why are you the best fit for this student?")} name="coverNote" state={state} hint={`${len}/2000 · ${t("কমপক্ষে ৬০ অক্ষর", "min 60 characters")}`}>
                <Textarea id="coverNote" name="coverNote" required minLength={60} maxLength={2000} rows={6} onChange={(e) => setLen(e.target.value.length)}
                  placeholder={t("আপনার অভিজ্ঞতা, পড়ানোর পদ্ধতি, এই বিষয়ে ফলাফল, কবে থেকে শুরু করতে পারবেন…", "Your experience, teaching approach, results in these subjects, when you can start…")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("প্রত্যাশিত সম্মানী (৳/মাস, ঐচ্ছিক)", "Proposed salary (৳/month, optional)")} name="proposedSalary" state={state}>
                  <Input id="proposedSalary" name="proposedSalary" type="number" min={500} step={500} placeholder={String(post.budgetMax)} />
                </Field>
                <Field label={t("কখন পড়াতে পারবেন (ঐচ্ছিক)", "Availability (optional)")} name="availability" state={state}>
                  <Input id="availability" name="availability" maxLength={120} placeholder={t("যেমন: শনি–বুধ, বিকেল ৫টার পর", "e.g. Sat–Wed after 5pm")} />
                </Field>
              </div>
              {state && !state.ok && state.code !== "DUPLICATE_APPLICATION" && <FormMessage state={state} />}
              {/* SubmitButton disables itself while the action is pending → no double submit */}
              <SubmitButton className="w-full" disabled={len < 60}>{t("আবেদন পাঠান", "Send application")}</SubmitButton>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
