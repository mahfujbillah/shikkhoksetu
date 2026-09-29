"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Send, ShieldAlert } from "lucide-react";
import { applyAction } from "@/server/actions/marketplace";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { ActionForm, Field, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";

export type ApplyViewer = {
  signedIn: boolean;
  userId?: string;
  role?: "STUDENT_GUARDIAN" | "TUTOR" | "ADMIN";
  verification?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | null;
  appliedPostIds: string[];
};

/**
 * "Apply Now" dialog with client-side hints and server-side enforcement.
 * The server action re-checks everything (verification, duplicates, job status) — the UI only
 * explains *why* someone can't apply before they try.
 */
export function ApplyDialog({ post, viewer }: { post: { id: string; title: string; budgetMax: number; genderPreference: string; status: string; guardianId: string }; viewer: ApplyViewer }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [len, setLen] = useState(0);
  const [done, setDone] = useState(viewer.appliedPostIds.includes(post.id));

  if (done) return <span className="inline-flex items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 className="size-4" /> {t("আবেদন করেছেন", "Applied")}</span>;
  if (post.status !== "OPEN" && post.status !== "SHORTLISTED") return <span className="text-sm text-muted-foreground">{t("বন্ধ", "Closed")}</span>;
  if (!viewer.signedIn) return <Link href={`/login?next=/tuitions/${post.id}`} className={buttonVariants({ size: "sm" })}>{t("আবেদন করুন", "Apply now")}</Link>;
  if (viewer.role !== "TUTOR" || viewer.userId === post.guardianId) return null;

  const blocker =
    viewer.verification == null ? { text: t("আবেদনের আগে শিক্ষক প্রোফাইল পূরণ করুন।", "Complete your tutor profile before applying."), href: "/dashboard/profile", cta: t("প্রোফাইল পূরণ করুন", "Complete profile") }
    : viewer.verification !== "VERIFIED" ? { text: viewer.verification === "PENDING" ? t("আপনার KYC যাচাই চলছে। যাচাই শেষ হলেই আবেদন করতে পারবেন।", "Your KYC is under review — you can apply once you're verified.") : t("শুধু যাচাইকৃত শিক্ষকরা আবেদন করতে পারেন। KYC ডকুমেন্ট জমা দিন।", "Only verified tutors can apply. Submit your KYC documents."), href: "/dashboard/kyc", cta: t("KYC-তে যান", "Go to KYC") }
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Send /> {t("আবেদন করুন", "Apply now")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("আবেদন করুন", "Apply to this tuition")}</DialogTitle>
          <DialogDescription>{post.title}</DialogDescription>
        </DialogHeader>
        {blocker ? (
          <div className="rounded-xl border border-dashed border-accent bg-accent/10 p-4 text-sm">
            <p className="flex gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> {blocker.text}</p>
            <Link href={blocker.href} className={buttonVariants({ size: "sm", className: "mt-3" })}>{blocker.cta}</Link>
          </div>
        ) : (
          <ActionForm action={applyAction} onSuccess={() => setDone(true)} className="space-y-4">
            {(state) => (
              <>
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
                <SubmitButton className="w-full" disabled={len > 0 && len < 60}>{t("আবেদন পাঠান", "Send application")}</SubmitButton>
              </>
            )}
          </ActionForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
