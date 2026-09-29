"use client";

import { useState } from "react";
import { CITIES, CURRICULA, GRADES, SUBJECTS, TUITION_TYPES } from "@/lib/catalog";
import { createTuitionAction } from "@/server/actions/marketplace";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionForm, Chips, Field, FieldError, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";
import { cn } from "@/lib/utils";

export function PostTuitionForm({ defaultPhone }: { defaultPhone?: string | null }) {
  const { t, lang } = useT();
  const [type, setType] = useState<keyof typeof TUITION_TYPES>("HOME");
  const [city, setCity] = useState("DHAKA");
  const online = type === "ONLINE_ONE_TO_ONE";

  return (
    <ActionForm action={createTuitionAction} className="space-y-6">
      {(s) => (
        <>
          <Card className="space-y-5 p-6">
            <h2 className="font-bold">{t("১. শিক্ষার্থী ও বিষয়", "1. Student & subjects")}</h2>
            <Field label={t("শিরোনাম", "Title")} name="title" state={s}><Input id="title" name="title" required maxLength={120} placeholder={t("যেমন: SSC বিজ্ঞান — পদার্থ ও গণিতের জন্য শিক্ষক চাই", "e.g. SSC Science — need a Physics & Math tutor")} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("শ্রেণি", "Class / Grade")} name="grade" state={s}><Select id="grade" name="grade" required defaultValue=""><option value="" disabled>—</option>{GRADES.map((g) => <option key={g.code} value={g.code}>{g[lang]}</option>)}</Select></Field>
              <Field label={t("মাধ্যম / কারিকুলাম", "Curriculum")} name="curriculum" state={s}><Select id="curriculum" name="curriculum" defaultValue="BANGLA_MEDIUM">{Object.entries(CURRICULA).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}</Select></Field>
            </div>
            <div><Field label={t("বিষয়সমূহ", "Subjects")}><Chips name="subjects" max={8} options={SUBJECTS.map((x) => ({ value: x.code, label: x[lang] }))} /></Field><FieldError state={s} name="subjects" /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("শিক্ষার্থীর নাম (ঐচ্ছিক)", "Student name (optional)")} name="studentName" state={s}><Input name="studentName" maxLength={80} /></Field>
              <Field label={t("শিক্ষার্থীর লিঙ্গ (ঐচ্ছিক)", "Student gender (optional)")}><Select name="studentGender" defaultValue=""><option value="">—</option><option value="MALE">{t("ছেলে", "Male")}</option><option value="FEMALE">{t("মেয়ে", "Female")}</option></Select></Field>
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="font-bold">{t("২. কীভাবে পড়বে", "2. How & where")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(TUITION_TYPES).map(([k, v]) => (
                <label key={k} className={cn("cursor-pointer rounded-xl border p-4 transition", type === k ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary")}>
                  <input type="radio" name="tuitionType" value={k} checked={type === k} onChange={() => setType(k as keyof typeof TUITION_TYPES)} className="sr-only" />
                  <p className="font-semibold">{v[lang]}</p><p className="mt-1 text-xs text-muted-foreground">{v.hint[lang]}</p>
                </label>
              ))}
            </div>
            {type === "GROUP_BATCH" && <Field label={t("কতজন শিক্ষার্থী", "Number of students")} name="studentsCount" state={s} className="max-w-40"><Input name="studentsCount" type="number" min={2} max={30} defaultValue={3} /></Field>}
            {!online && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("শহর", "City")} name="city" state={s}><Select name="city" value={city} onChange={(e) => setCity(e.target.value)}>{CITIES.map((c) => <option key={c.code} value={c.code}>{c[lang]}</option>)}</Select></Field>
                <Field label={t("এলাকা", "Area")} name="area" state={s}><Select name="area" defaultValue="" key={city}><option value="" disabled>—</option>{CITIES.find((c) => c.code === city)?.areas.map((a) => <option key={a.code} value={a.code}>{a[lang]}</option>)}</Select></Field>
                <Field label={t("বিস্তারিত ঠিকানা (শুধু নিয়োগপ্রাপ্ত শিক্ষক দেখবেন)", "Street address (only the hired tutor sees it)")} name="addressLine" state={s} className="sm:col-span-2"><Input name="addressLine" maxLength={200} /></Field>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label={t("সপ্তাহে কতদিন", "Days per week")} name="daysPerWeek" state={s}><Select name="daysPerWeek" defaultValue="3">{[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
              <Field label={t("প্রতি সেশন (মিনিট)", "Session length (min)")} name="sessionMinutes" state={s}><Select name="sessionMinutes" defaultValue="60">{[45, 60, 90, 120].map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
              <Field label={t("পছন্দের সময়", "Preferred time")} name="preferredTime" state={s}><Input name="preferredTime" maxLength={60} placeholder={t("যেমন: বিকেল ৫টার পর", "e.g. after 5pm")} /></Field>
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <h2 className="font-bold">{t("৩. বাজেট ও পছন্দ", "3. Budget & preferences")}</h2>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label={t("সর্বনিম্ন (৳/মাস)", "Min (৳/month)")} name="budgetMin" state={s}><Input name="budgetMin" type="number" min={500} step={500} /></Field>
              <Field label={t("সর্বোচ্চ (৳/মাস)", "Max (৳/month)")} name="budgetMax" state={s}><Input name="budgetMax" type="number" min={500} step={500} required /></Field>
              <Field label={t("শিক্ষকের লিঙ্গ", "Tutor gender")} name="genderPreference" state={s}><Select name="genderPreference" defaultValue="ANY"><option value="ANY">{t("যেকোনো", "Any")}</option><option value="MALE">{t("পুরুষ", "Male")}</option><option value="FEMALE">{t("নারী", "Female")}</option></Select></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="salaryNegotiable" className="size-4 accent-[var(--primary)]" /> {t("সম্মানী আলোচনাসাপেক্ষ", "Salary is negotiable")}</label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("কবে থেকে শুরু (ঐচ্ছিক)", "Start date (optional)")} name="startDate" state={s}><Input name="startDate" type="date" /></Field>
              <Field label={t("আপনার ফোন (নিয়োগের পর শিক্ষক দেখবেন)", "Your phone (shared with the hired tutor)")} name="phone" state={s}><Input name="phone" type="tel" required defaultValue={defaultPhone ?? ""} placeholder="01XXXXXXXXX" /></Field>
            </div>
            <Field label={t("অতিরিক্ত প্রত্যাশা", "Anything else tutors should know")} name="requirements" state={s}><Textarea name="requirements" maxLength={1500} placeholder={t("শিক্ষার্থীর দুর্বলতা, লক্ষ্য, পছন্দের পড়ানোর ধরন…", "Weak areas, goals, preferred teaching style…")} /></Field>
          </Card>
          <SubmitButton size="lg" className="w-full">{t("টিউশন পোস্ট করুন", "Publish tuition")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
