"use client";

import { CITIES, CURRICULA, GRADES, SUBJECTS, TUITION_TYPES } from "@/lib/catalog";
import { saveTutorProfileAction } from "@/server/actions/account";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionForm, Chips, Field, FieldError, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";

export type ProfileDefaults = {
  fullName: string; phone: string; gender?: string; headline?: string; bio?: string; university?: string; department?: string; degree?: string;
  graduationYear?: number; currentlyStudying?: boolean; experienceYears?: number; monthlyRate?: number; hourlyRate?: number; subjects: string[];
  grades: string[]; curricula: string[]; tuitionTypes: string[]; preferredCities: string[]; preferredAreas: string[]; maxDaysPerWeek?: number;
};

export function TutorProfileForm({ d }: { d: ProfileDefaults }) {
  const { t, lang } = useT();
  const allAreas = CITIES.flatMap((c) => c.areas.map((a) => ({ value: a.code, label: `${a[lang]} (${c[lang]})` })));
  return (
    <ActionForm action={saveTutorProfileAction} className="space-y-6">
      {(s) => (
        <>
          <Card className="grid gap-5 p-6 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">{t("ব্যক্তিগত", "Personal")}</h2>
            <Field label={t("পূর্ণ নাম", "Full name")} name="fullName" state={s}><Input name="fullName" defaultValue={d.fullName} required /></Field>
            <Field label={t("মোবাইল (নিয়োগের পর অভিভাবক দেখবেন)", "Mobile (shared after hire)")} name="phone" state={s}><Input name="phone" type="tel" defaultValue={d.phone} placeholder="01XXXXXXXXX" required /></Field>
            <Field label={t("লিঙ্গ", "Gender")} name="gender" state={s}><Select name="gender" defaultValue={d.gender ?? ""} required><option value="" disabled>—</option><option value="MALE">{t("পুরুষ", "Male")}</option><option value="FEMALE">{t("নারী", "Female")}</option></Select></Field>
            <Field label={t("এক লাইনে নিজের পরিচয়", "Headline")} name="headline" state={s}><Input name="headline" defaultValue={d.headline} maxLength={120} placeholder={t("যেমন: BUET EEE · পদার্থ ও গণিতে ৩ বছর", "e.g. BUET EEE · 3 yrs Physics & Math")} /></Field>
            <Field label={t("বিস্তারিত পরিচিতি", "About you")} name="bio" state={s} className="sm:col-span-2"><Textarea name="bio" defaultValue={d.bio} maxLength={2000} rows={5} /></Field>
          </Card>
          <Card className="grid gap-5 p-6 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">{t("শিক্ষাগত যোগ্যতা", "Education")}</h2>
            <Field label={t("বিশ্ববিদ্যালয় / প্রতিষ্ঠান", "University / institution")} name="university" state={s}><Input name="university" defaultValue={d.university} required /></Field>
            <Field label={t("বিভাগ", "Department")} name="department" state={s}><Input name="department" defaultValue={d.department} /></Field>
            <Field label={t("ডিগ্রি", "Degree")} name="degree" state={s}><Input name="degree" defaultValue={d.degree} placeholder="BSc in EEE" /></Field>
            <Field label={t("পাসের বছর", "Graduation year")} name="graduationYear" state={s}><Input name="graduationYear" type="number" min={1970} max={2040} defaultValue={d.graduationYear} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="currentlyStudying" defaultChecked={d.currentlyStudying} className="size-4 accent-[var(--primary)]" /> {t("এখনো অধ্যয়নরত", "Currently studying")}</label>
          </Card>
          <Card className="space-y-5 p-6">
            <h2 className="font-bold">{t("পড়ানোর পছন্দ", "Teaching preferences")}</h2>
            <div><Field label={t("বিষয়", "Subjects")}><Chips name="subjects" defaultValue={d.subjects} options={SUBJECTS.filter((x) => x.code !== "ALL").map((x) => ({ value: x.code, label: x[lang] }))} /></Field><FieldError state={s} name="subjects" /></div>
            <div><Field label={t("শ্রেণি", "Classes")}><Chips name="grades" defaultValue={d.grades} options={GRADES.map((x) => ({ value: x.code, label: x[lang] }))} /></Field><FieldError state={s} name="grades" /></div>
            <div><Field label={t("কারিকুলাম", "Curricula")}><Chips name="curricula" defaultValue={d.curricula} options={Object.entries(CURRICULA).map(([k, v]) => ({ value: k, label: v[lang] }))} /></Field><FieldError state={s} name="curricula" /></div>
            <div><Field label={t("টিউশনের ধরন", "Tutoring types")}><Chips name="tuitionTypes" defaultValue={d.tuitionTypes} options={Object.entries(TUITION_TYPES).map(([k, v]) => ({ value: k, label: v[lang] }))} /></Field><FieldError state={s} name="tuitionTypes" /></div>
            <Field label={t("পছন্দের শহর", "Preferred cities")}><Chips name="preferredCities" defaultValue={d.preferredCities} options={CITIES.map((c) => ({ value: c.code, label: c[lang] }))} /></Field>
            <Field label={t("পছন্দের এলাকা", "Preferred areas")}><Chips name="preferredAreas" defaultValue={d.preferredAreas} options={allAreas} /></Field>
            <div className="grid gap-5 sm:grid-cols-4">
              <Field label={t("অভিজ্ঞতা (বছর)", "Experience (yrs)")} name="experienceYears" state={s}><Input name="experienceYears" type="number" min={0} max={50} defaultValue={d.experienceYears ?? 0} /></Field>
              <Field label={t("মাসিক রেট (৳)", "Monthly rate (৳)")} name="monthlyRate" state={s}><Input name="monthlyRate" type="number" min={500} step={500} defaultValue={d.monthlyRate} /></Field>
              <Field label={t("ঘণ্টা প্রতি (৳)", "Hourly rate (৳)")} name="hourlyRate" state={s}><Input name="hourlyRate" type="number" min={100} step={50} defaultValue={d.hourlyRate} /></Field>
              <Field label={t("সপ্তাহে সর্বোচ্চ দিন", "Max days/week")} name="maxDaysPerWeek" state={s}><Input name="maxDaysPerWeek" type="number" min={1} max={7} defaultValue={d.maxDaysPerWeek} /></Field>
            </div>
          </Card>
          <SubmitButton size="lg" className="w-full">{t("প্রোফাইল সংরক্ষণ", "Save profile")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
