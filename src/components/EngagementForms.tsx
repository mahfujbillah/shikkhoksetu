"use client";

import { confirmSalaryAction, confirmSessionAction, linkLmsAction, logSessionAction, recordSalaryAction, reviewAction, shareLmsAction } from "@/server/actions/account";
import { endAgreementAction } from "@/server/actions/marketplace";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionButton, ActionForm, Field, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";

export function LogSessionForm({ agreementId, minutes }: { agreementId: string; minutes: number }) {
  const { t } = useT();
  const today = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
  return (
    <ActionForm action={logSessionAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4">
      {(s) => (<>
        <input type="hidden" name="agreementId" value={agreementId} />
        <Field label={t("তারিখ", "Date")} name="date" state={s}><Input name="date" type="date" max={today} defaultValue={today} required /></Field>
        <Field label={t("মিনিট", "Minutes")} name="durationMinutes" state={s}><Input name="durationMinutes" type="number" min={10} max={300} defaultValue={minutes} /></Field>
        <Field label={t("অবস্থা", "Status")} name="status" state={s}><Select name="status" defaultValue="COMPLETED"><option value="COMPLETED">{t("সম্পন্ন", "Completed")}</option><option value="MISSED">{t("মিস", "Missed")}</option><option value="CANCELLED">{t("বাতিল", "Cancelled")}</option><option value="RESCHEDULED">{t("পুনর্নির্ধারিত", "Rescheduled")}</option></Select></Field>
        <Field label={t("আজ কী পড়ানো হলো", "Topics covered")} name="topicsCovered" state={s}><Input name="topicsCovered" maxLength={500} /></Field>
        <Field label={t("হোমওয়ার্ক", "Homework")} name="homework" state={s} className="sm:col-span-2"><Input name="homework" maxLength={500} /></Field>
        <Field label={t("নোট", "Note")} name="tutorNote" state={s} className="sm:col-span-2"><Input name="tutorNote" maxLength={500} /></Field>
        <div className="sm:col-span-4"><SubmitButton size="sm">{t("সেশন লগ করুন", "Log session")}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function ConfirmSessionButton({ sessionId, agreementId }: { sessionId: string; agreementId: string }) {
  const { t } = useT();
  return <ActionButton action={confirmSessionAction} fields={{ sessionId, agreementId }} size="sm" variant="outline">{t("নিশ্চিত করুন", "Confirm")}</ActionButton>;
}

export function SalaryForm({ agreementId, amount }: { agreementId: string; amount: number }) {
  const { t } = useT();
  const month = new Date().toISOString().slice(0, 7);
  return (
    <ActionForm action={recordSalaryAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="agreementId" value={agreementId} />
      <Field label={t("মাস", "Month")}><Input name="periodMonth" type="month" defaultValue={month} required /></Field>
      <Field label={t("পরিমাণ (৳)", "Amount (৳)")}><Input name="amount" type="number" min={1} defaultValue={amount} required /></Field>
      <Field label={t("মাধ্যম", "Method")}><Select name="method" defaultValue="bKash"><option>bKash</option><option>Nagad</option><option>Cash</option><option>Bank</option></Select></Field>
      <SubmitButton size="sm">{t("পরিশোধ রেকর্ড", "Record payment")}</SubmitButton>
    </ActionForm>
  );
}

export function ConfirmSalaryButton({ salaryId, agreementId }: { salaryId: string; agreementId: string }) {
  const { t } = useT();
  return <ActionButton action={confirmSalaryAction} fields={{ salaryId, agreementId }} size="sm" variant="outline">{t("পেয়েছি", "Received")}</ActionButton>;
}

export function ShareLmsForm({ agreementId }: { agreementId: string }) {
  const { t } = useT();
  return (
    <ActionForm action={shareLmsAction} resetOnSuccess className="grid gap-3 sm:grid-cols-4">
      {(s) => (<>
        <input type="hidden" name="agreementId" value={agreementId} />
        <Field label={t("ধরন", "Type")} name="type" state={s}><Select name="type" defaultValue="COURSE"><option value="COURSE">{t("কোর্স", "Course")}</option><option value="VIDEO">{t("ভিডিও", "Video")}</option><option value="ASSIGNMENT">{t("অ্যাসাইনমেন্ট", "Assignment")}</option><option value="MATERIAL">{t("নোট/ম্যাটেরিয়াল", "Material")}</option><option value="QUIZ">{t("কুইজ", "Quiz")}</option></Select></Field>
        <Field label={t("শিরোনাম", "Title")} name="title" state={s}><Input name="title" required maxLength={150} /></Field>
        <Field label={t("LMS লিংক", "LMS link")} name="url" state={s}><Input name="url" type="url" required placeholder="https://" /></Field>
        <Field label={t("শেষ তারিখ", "Due")} name="dueDate" state={s}><Input name="dueDate" type="date" /></Field>
        <div className="sm:col-span-4"><SubmitButton size="sm">{t("শেয়ার করুন", "Share")}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function LinkLmsForm({ agreementId, current }: { agreementId: string; current?: string | null }) {
  const { t } = useT();
  return (
    <ActionForm action={linkLmsAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="agreementId" value={agreementId} />
      <Field label={t("শিক্ষার্থীর LMS আইডি", "Student's LMS ID")}><Input name="lmsStudentId" defaultValue={current ?? ""} placeholder="stu_12345" /></Field>
      <SubmitButton size="sm" variant="outline">{t("যুক্ত করুন", "Link")}</SubmitButton>
    </ActionForm>
  );
}

export function ReviewForm({ agreementId }: { agreementId: string }) {
  const { t } = useT();
  return (
    <ActionForm action={reviewAction} className="space-y-3">
      <input type="hidden" name="agreementId" value={agreementId} />
      <Field label={t("রেটিং", "Rating")}><Select name="rating" defaultValue="5" className="w-40">{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{"★".repeat(r)}</option>)}</Select></Field>
      <Field label={t("মন্তব্য", "Comment")}><Textarea name="comment" maxLength={1000} /></Field>
      <SubmitButton size="sm">{t("রিভিউ দিন", "Submit review")}</SubmitButton>
    </ActionForm>
  );
}

export function EndEngagement({ agreementId }: { agreementId: string }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton action={endAgreementAction} fields={{ agreementId, kind: "COMPLETED", reason: "Completed" }} size="sm" variant="outline" confirm={t("টিউশন সম্পন্ন হিসেবে চিহ্নিত করবেন?", "Mark this tuition as completed?")}>{t("সম্পন্ন", "Mark completed")}</ActionButton>
      <ActionButton action={endAgreementAction} fields={{ agreementId, kind: "TERMINATED", reason: "Ended with notice" }} size="sm" variant="ghost" confirm={t("৭ দিনের নোটিশে টিউশন শেষ করবেন?", "End this tuition with 7 days' notice?")}>{t("শেষ করুন", "End engagement")}</ActionButton>
    </div>
  );
}
