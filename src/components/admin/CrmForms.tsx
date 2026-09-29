"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  addNoteAction, adjustCreditsAction, adminAgreementAction, announceAction, applicationStatusAction,
  deleteReviewAction, forceVerifyAction, reopenPostAction, updatePostAction, updateUserAction,
} from "@/server/actions/crm";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/FormBits";
import { useT } from "@/components/LanguageProvider";
import { Input, Select, Textarea } from "@/components/ui/input";

function Back() {
  return <input type="hidden" name="back" value={usePathname()} />;
}

export function NoteForm({ entity, entityId }: { entity: string; entityId: string }) {
  const { t } = useT();
  return (
    <ActionForm action={addNoteAction} resetOnSuccess className="space-y-2">
      <Back />
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="entityId" value={entityId} />
      <Textarea name="text" required maxLength={2000} className="min-h-16" placeholder={t("অভ্যন্তরীণ নোট (শুধু অ্যাডমিন দেখবে)…", "Internal note (admins only)…")} />
      <SubmitButton size="sm">{t("নোট যোগ করুন", "Add note")}</SubmitButton>
    </ActionForm>
  );
}

export function UserEditForm({ user }: { user: { id: string; fullName: string; phone: string | null; lmsUserId: string | null } }) {
  const { t } = useT();
  return (
    <ActionForm action={updateUserAction} className="grid gap-3 sm:grid-cols-3">
      <Back />
      <input type="hidden" name="userId" value={user.id} />
      <Field label={t("নাম", "Full name")}><Input name="fullName" defaultValue={user.fullName} required /></Field>
      <Field label={t("ফোন", "Phone")}><Input name="phone" defaultValue={user.phone ?? ""} inputMode="tel" /></Field>
      <Field label="LMS user id"><Input name="lmsUserId" defaultValue={user.lmsUserId ?? ""} /></Field>
      <div className="sm:col-span-3"><SubmitButton size="sm">{t("সংরক্ষণ", "Save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function CreditsForm({ tutorProfileId }: { tutorProfileId: string }) {
  const { t } = useT();
  return (
    <ActionForm action={adjustCreditsAction} resetOnSuccess className="flex flex-wrap items-end gap-2">
      <Back />
      <input type="hidden" name="tutorProfileId" value={tutorProfileId} />
      <Field label={t("ক্রেডিট (+ যোগ / − কাটা)", "Credits (+ add / − deduct)")}><Input name="credits" type="number" step={1} defaultValue={10} className="w-32" /></Field>
      <SubmitButton size="sm" variant="outline">{t("প্রয়োগ", "Apply")}</SubmitButton>
    </ActionForm>
  );
}

export function ForceVerify({ tutorProfileId, current }: { tutorProfileId: string; current: string }) {
  const { t } = useT();
  return (
    <ActionForm action={forceVerifyAction} className="flex flex-wrap items-end gap-2">
      <Back />
      <input type="hidden" name="tutorProfileId" value={tutorProfileId} />
      <Field label={t("ব্যাজ (সুপার অ্যাডমিন ওভাররাইড)", "Badge (super admin override)")}>
        <Select name="status" defaultValue={current === "PENDING" ? "VERIFIED" : current} className="w-40"><option value="VERIFIED">VERIFIED</option><option value="UNVERIFIED">UNVERIFIED</option><option value="REJECTED">REJECTED</option></Select>
      </Field>
      <Field label={t("নোট", "Note")}><Input name="note" placeholder={t("ঐচ্ছিক", "optional")} className="w-48" /></Field>
      <SubmitButton size="sm" variant="outline">{t("সেট করুন", "Set")}</SubmitButton>
    </ActionForm>
  );
}

type PostEdit = { id: string; title: string; budgetMax: string; budgetMin: string | null; daysPerWeek: number; requirements: string | null; addressLine: string | null; maxShortlist: number };
export function PostEditForm({ post }: { post: PostEdit }) {
  const { t } = useT();
  return (
    <ActionForm action={updatePostAction} className="grid gap-3 sm:grid-cols-2">
      <Back />
      <input type="hidden" name="postId" value={post.id} />
      <Field label={t("শিরোনাম", "Title")} className="sm:col-span-2"><Input name="title" defaultValue={post.title} required /></Field>
      <Field label={t("সর্বনিম্ন বেতন", "Budget min")}><Input name="budgetMin" type="number" defaultValue={post.budgetMin ?? ""} /></Field>
      <Field label={t("সর্বোচ্চ বেতন", "Budget max")}><Input name="budgetMax" type="number" defaultValue={post.budgetMax} required /></Field>
      <Field label={t("সপ্তাহে দিন", "Days / week")}><Input name="daysPerWeek" type="number" min={1} max={7} defaultValue={post.daysPerWeek} /></Field>
      <Field label={t("সর্বোচ্চ শর্টলিস্ট", "Max shortlist")}><Input name="maxShortlist" type="number" min={1} max={10} defaultValue={post.maxShortlist} /></Field>
      <Field label={t("ঠিকানা (গোপন)", "Address (private)")} className="sm:col-span-2"><Input name="addressLine" defaultValue={post.addressLine ?? ""} /></Field>
      <Field label={t("প্রয়োজনীয়তা", "Requirements")} className="sm:col-span-2"><Textarea name="requirements" defaultValue={post.requirements ?? ""} /></Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t("সংরক্ষণ", "Save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function ReopenPost({ postId }: { postId: string }) {
  const { t } = useT();
  return <ActionButton action={reopenPostAction} fields={{ postId, back: usePathname() }} size="sm" variant="outline" confirm="Re-open this tuition?">{t("আবার খুলুন", "Re-open")}</ActionButton>;
}

export function ApplicationControls({ id, status }: { id: string; status: string }) {
  const { t } = useT();
  const back = usePathname();
  if (status === "PENDING" || status === "SHORTLISTED") return <ActionButton action={applicationStatusAction} fields={{ applicationId: id, to: "REJECTED", back }} size="sm" variant="ghost" confirm="Reject this application?">{t("বাতিল", "Reject")}</ActionButton>;
  if (status === "REJECTED" || status === "WITHDRAWN") return <ActionButton action={applicationStatusAction} fields={{ applicationId: id, to: "PENDING", back }} size="sm" variant="ghost">{t("পুনরুদ্ধার", "Restore")}</ActionButton>;
  return null;
}

export function AgreementControls({ id, status }: { id: string; status: string }) {
  const { t } = useT();
  const [kind, setKind] = useState(status === "PENDING_SIGNATURES" ? "CANCEL" : "COMPLETED");
  if (status !== "PENDING_SIGNATURES" && status !== "ACTIVE") return <p className="text-sm text-muted-foreground">{t("এই চুক্তি আর পরিবর্তন করা যাবে না।", "This agreement is closed.")}</p>;
  return (
    <ActionForm action={adminAgreementAction} className="flex flex-wrap items-end gap-2">
      <Back />
      <input type="hidden" name="agreementId" value={id} />
      <Field label={t("কাজ", "Action")}>
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="w-44">
          {status === "PENDING_SIGNATURES" ? <option value="CANCEL">{t("বাতিল করুন", "Cancel")}</option> : <><option value="COMPLETED">{t("সম্পন্ন", "Mark completed")}</option><option value="TERMINATED">{t("বাতিল/সমাপ্ত", "Terminate")}</option></>}
        </Select>
      </Field>
      <Field label={t("কারণ", "Reason")}><Input name="reason" required className="w-64" /></Field>
      <SubmitButton size="sm" variant={kind === "COMPLETED" ? "default" : "destructive"}>{t("প্রয়োগ", "Apply")}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteReview({ id }: { id: string }) {
  return <ActionButton action={deleteReviewAction} fields={{ reviewId: id, back: usePathname() }} size="sm" variant="ghost" confirm="Delete this review permanently?">Delete</ActionButton>;
}

export function AnnounceForm({ userId, isSuper }: { userId?: string; isSuper: boolean }) {
  const { t } = useT();
  const [aud, setAud] = useState(userId ? "USER" : "TUTOR");
  return (
    <ActionForm action={announceAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
      <Back />
      {userId ? <input type="hidden" name="audience" value="USER" /> : (
        <Field label={t("কাকে পাঠাবেন", "Audience")}>
          <Select name="audience" value={aud} onChange={(e) => setAud(e.target.value)}>
            {isSuper && <option value="ALL">{t("সবাই", "Everyone")}</option>}
            <option value="TUTOR">{t("সব শিক্ষক", "All tutors")}</option>
            <option value="VERIFIED_TUTORS">{t("যাচাইকৃত শিক্ষক", "Verified tutors")}</option>
            <option value="STUDENT_GUARDIAN">{t("সব অভিভাবক/ছাত্র", "All guardians / students")}</option>
            <option value="ADMIN">{t("অ্যাডমিন", "Admins")}</option>
            <option value="USER">{t("একজন ব্যবহারকারী (ID)", "One user (id)")}</option>
          </Select>
        </Field>
      )}
      {(userId || aud === "USER") && <Field label="User id"><Input name="userId" defaultValue={userId} readOnly={!!userId} required /></Field>}
      <Field label={t("শিরোনাম", "Title")} className="sm:col-span-2"><Input name="title" required maxLength={140} /></Field>
      <Field label={t("বার্তা", "Message")} className="sm:col-span-2"><Textarea name="body" maxLength={1000} /></Field>
      <Field label={t("লিংক (ঐচ্ছিক)", "Link (optional)")} hint="/tuitions or https://…" className="sm:col-span-2"><Input name="link" /></Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t("পাঠান", "Send")}</SubmitButton></div>
    </ActionForm>
  );
}
