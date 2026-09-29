"use client";

import { useState } from "react";
import { CalendarPlus, FileSignature, Handshake } from "lucide-react";
import { hireAction, rejectAction, scheduleTrialAction, shortlistAction, unshortlistAction } from "@/server/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionButton, ActionForm, Field, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";

type Props = { applicationId: string; postId: string; status: string; tutorName: string; guardianName: string; canShortlist: boolean; hireLocked: boolean; defaults: { salary: number; days: number; minutes: number; online: boolean } };

export function ApplicantActions(p: Props) {
  const { t } = useT();
  const fields = { applicationId: p.applicationId, postId: p.postId };
  if (p.status === "PENDING") {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton action={shortlistAction} fields={fields} size="sm" disabled={!p.canShortlist} title={!p.canShortlist ? t("শর্টলিস্ট পূর্ণ", "Shortlist is full") : undefined}>{t("শর্টলিস্ট", "Shortlist")}</ActionButton>
        <ActionButton action={rejectAction} fields={fields} size="sm" variant="ghost" confirm={t("এই আবেদন বাতিল করবেন?", "Reject this applicant?")}>{t("বাতিল", "Reject")}</ActionButton>
      </div>
    );
  }
  if (p.status === "SHORTLISTED") {
    return (
      <div className="flex flex-wrap gap-2">
        <TrialDialog {...p} />
        {!p.hireLocked && <HireDialog {...p} />}
        <ActionButton action={unshortlistAction} fields={fields} size="sm" variant="ghost">{t("শর্টলিস্ট থেকে সরান", "Remove")}</ActionButton>
      </div>
    );
  }
  return null;
}

function TrialDialog(p: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(p.defaults.online ? "ONLINE_LMS" : "IN_PERSON");
  const [paid, setPaid] = useState(false);
  const minDate = new Date(Date.now() + 60 * 60_000 + 6 * 3600_000).toISOString().slice(0, 16); // ≥1h ahead, Dhaka time
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><CalendarPlus /> {t("ট্রায়াল ক্লাস", "Schedule trial")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("ট্রায়াল ক্লাস নির্ধারণ", "Schedule a trial class")}</DialogTitle><DialogDescription>{p.tutorName}</DialogDescription></DialogHeader>
        <ActionForm action={scheduleTrialAction} onSuccess={() => setTimeout(() => setOpen(false), 1200)} className="space-y-4">
          {(s) => (
            <>
              <input type="hidden" name="applicationId" value={p.applicationId} /><input type="hidden" name="postId" value={p.postId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("তারিখ ও সময় (ঢাকা)", "Date & time (Dhaka)")} name="scheduledAt" state={s}><Input name="scheduledAt" type="datetime-local" min={minDate} required /></Field>
                <Field label={t("সময়কাল (মিনিট)", "Duration (min)")} name="durationMinutes" state={s}><Select name="durationMinutes" defaultValue="45">{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
              </div>
              <Field label={t("ধরন", "Mode")} name="mode" state={s}>
                <Select name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="ONLINE_LMS">{t("LMS লাইভ ক্লাসরুম (হোয়াইটবোর্ডসহ)", "LMS live classroom (with whiteboard)")}</option>
                  <option value="ONLINE_MEET">{t("ভিডিও মিটিং (অটো লিংক / Google Meet)", "Video meeting (auto link / Google Meet)")}</option>
                  <option value="IN_PERSON">{t("সরাসরি (বাসায়)", "In person (home)")}</option>
                </Select>
              </Field>
              {mode === "ONLINE_MEET" && <Field label={t("Google Meet লিংক (ঐচ্ছিক — না দিলে অটো লিংক তৈরি হবে)", "Google Meet link (optional — we auto-create one otherwise)")} name="meetingLink" state={s}><Input name="meetingLink" type="url" placeholder="https://meet.google.com/…" /></Field>}
              {mode === "IN_PERSON" && <Field label={t("কোথায়", "Where")} name="location" state={s}><Input name="location" maxLength={200} /></Field>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPaid" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-[var(--primary)]" /> {t("পেইড ট্রায়াল", "Paid trial")}</label>
              {paid && <Field label={t("ট্রায়াল ফি (৳)", "Trial fee (৳)")} name="fee" state={s} className="max-w-48"><Input name="fee" type="number" min={500} step={100} /></Field>}
              <SubmitButton className="w-full">{t("নির্ধারণ করুন ও শিক্ষককে জানান", "Schedule & notify tutor")}</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function HireDialog(p: Props) {
  const { t } = useT();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm"><Handshake /> {t("নিয়োগ দিন", "Accept & hire")}</Button></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSignature className="size-5 text-primary" /> {t("ডিজিটাল চুক্তি তৈরি করুন", "Generate the digital agreement")}</DialogTitle>
          <DialogDescription>{t(`${p.tutorName}-এর সাথে চূড়ান্ত শর্ত নির্ধারণ করুন। শিক্ষক স্বাক্ষর করলে নিয়োগ লক হবে।`, `Set the final terms with ${p.tutorName}. The hire locks when the tutor counter-signs.`)}</DialogDescription>
        </DialogHeader>
        <ActionForm action={hireAction} className="space-y-4">
          {(s) => (
            <>
              <input type="hidden" name="applicationId" value={p.applicationId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("মাসিক সম্মানী (৳)", "Monthly salary (৳)")} name="monthlySalary" state={s}><Input name="monthlySalary" type="number" min={500} step={100} defaultValue={p.defaults.salary} required /></Field>
                <Field label={t("শুরুর তারিখ", "Start date")} name="startDate" state={s}><Input name="startDate" type="date" min={today} defaultValue={today} required /></Field>
                <Field label={t("সপ্তাহে কতদিন", "Days per week")} name="daysPerWeek" state={s}><Select name="daysPerWeek" defaultValue={String(p.defaults.days)}>{[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d}>{d}</option>)}</Select></Field>
                <Field label={t("প্রতি সেশন (মিনিট)", "Minutes per session")} name="sessionMinutes" state={s}><Select name="sessionMinutes" defaultValue={String(p.defaults.minutes)}>{[45, 60, 90, 120].map((d) => <option key={d}>{d}</option>)}</Select></Field>
              </div>
              <Field label={t("বিশেষ শর্ত (ঐচ্ছিক)", "Special terms (optional)")} name="specialTerms" state={s}><Textarea name="specialTerms" maxLength={1500} placeholder={t("যেমন: পরীক্ষার আগে অতিরিক্ত ক্লাস, মাসিক প্রগ্রেস রিপোর্ট…", "e.g. extra classes before exams, monthly progress report…")} /></Field>
              <div className="rounded-xl bg-muted/60 p-4">
                <Field label={t(`স্বাক্ষর — আপনার পূর্ণ নাম লিখুন: “${p.guardianName}”`, `Signature — type your full name: “${p.guardianName}”`)} name="signature" state={s}><Input name="signature" required autoComplete="off" placeholder={p.guardianName} /></Field>
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" /> {t("আমি চুক্তির শর্ত ও প্ল্যাটফর্ম সার্ভিস চার্জের নিয়ম পড়েছি ও সম্মত।", "I have read and agree to the agreement terms and the platform service-charge policy.")}</label>
              </div>
              <SubmitButton className="w-full">{t("চুক্তি তৈরি করুন ও স্বাক্ষর দিন", "Generate agreement & sign")}</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
