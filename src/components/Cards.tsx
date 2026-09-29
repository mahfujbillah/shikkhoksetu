import Link from "next/link";
import { BadgeCheck, CalendarDays, Clock, GraduationCap, Laptop, MapPin, Star, Users } from "lucide-react";
import { CURRICULA, GENDER_PREF, gradeLabel, locationLabel, subjectLabel, TUITION_TYPES } from "@/lib/catalog";
import { formatMoney, formatNumber, makeT, timeAgo, type Lang } from "@/lib/i18n";
import type { PublicPost } from "@/server/services/posts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApplyDialog, type ApplyViewer } from "./ApplyDialog";

export function salaryText(p: { budgetMin: unknown; budgetMax: unknown }, lang: Lang) {
  const max = formatMoney(String(p.budgetMax), lang);
  return p.budgetMin ? `${formatMoney(String(p.budgetMin), lang)}–${max.slice(1)}` : max;
}

/** Job card used on the board and the home page. */
export function TuitionCard({ post, lang, viewer }: { post: PublicPost; lang: Lang; viewer: ApplyViewer }) {
  const t = makeT(lang);
  const TypeIcon = post.isOnline ? Laptop : post.tuitionType === "GROUP_BATCH" ? Users : MapPin;
  return (
    <Card className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge>{TUITION_TYPES[post.tuitionType][lang]}</Badge>
            <Badge variant="secondary">{CURRICULA[post.curriculum][lang]}</Badge>
          </div>
          <Link href={`/tuitions/${post.id}`} className="mt-2 block font-bold leading-snug hover:text-primary">{post.title}</Link>
          <p className="mt-0.5 text-xs text-muted-foreground">#{formatNumber(post.number, lang)} · {timeAgo(post.createdAt, lang)}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-bold text-primary">{salaryText(post, lang)}</div>
          <div className="text-xs text-muted-foreground">{t("/মাস", "/month")}{post.salaryNegotiable ? t(" · আলোচনাসাপেক্ষ", " · negotiable") : ""}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.subjects.map((s) => <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{subjectLabel(s, lang)}</span>)}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5"><GraduationCap className="size-4 shrink-0" /> {gradeLabel(post.grade, lang)}</li>
        <li className="flex items-center gap-1.5"><TypeIcon className="size-4 shrink-0" /> <span className="truncate">{locationLabel(post, lang)}</span></li>
        <li className="flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0" /> {formatNumber(post.daysPerWeek, lang)} {t("দিন/সপ্তাহ", "days/week")}</li>
        <li className="flex items-center gap-1.5"><Clock className="size-4 shrink-0" /> {formatNumber(post.sessionMinutes, lang)} {t("মিনিট", "min")}</li>
        {post.genderPreference !== "ANY" && <li className="col-span-2 flex items-center gap-1.5"><Users className="size-4 shrink-0" /> {t("শিক্ষক", "Tutor")}: {GENDER_PREF[post.genderPreference][lang]}</li>}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 mt-5">
        <span className="text-xs text-muted-foreground">{formatNumber(post.applicationsCount, lang)} {t("জন আবেদন করেছেন", "applicants")}</span>
        <ApplyDialog post={{ id: post.id, title: post.title, budgetMax: Number(post.budgetMax), genderPreference: post.genderPreference, status: post.status, guardianId: post.guardianId }} viewer={viewer} />
      </div>
    </Card>
  );
}

export type TutorCardData = {
  id: string; gender: string; headline: string | null; university: string; department: string | null; experienceYears: number;
  monthlyRate: unknown; subjects: string[]; preferredCities: string[]; verificationStatus: string; ratingAvg: unknown; ratingCount: number;
  completedTuitions: number; user: { fullName: string };
};

export function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function TutorCard({ tutor, lang }: { tutor: TutorCardData; lang: Lang }) {
  const t = makeT(lang);
  return (
    <Card className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`grid size-14 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${tutor.gender === "FEMALE" ? "bg-accent/20 text-accent-foreground" : "bg-primary/15 text-primary"}`}>{initials(tutor.user.fullName)}</div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-bold">{tutor.user.fullName}{tutor.verificationStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}</h3>
          <p className="truncate text-sm text-muted-foreground">{tutor.university}{tutor.department ? ` · ${tutor.department}` : ""}</p>
        </div>
      </div>
      {tutor.headline && <p className="mt-3 line-clamp-2 text-sm">{tutor.headline}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">{tutor.subjects.slice(0, 5).map((s) => <span key={s} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{subjectLabel(s, lang)}</span>)}</div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Star className="size-4 fill-accent text-accent" /> {formatNumber(Number(tutor.ratingAvg).toFixed(1), lang)} ({formatNumber(tutor.ratingCount, lang)}) · {formatNumber(tutor.experienceYears, lang)} {t("বছর", "yrs")} · {formatNumber(tutor.completedTuitions, lang)} {t("টিউশন", "tuitions")}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-5">
        <span className="text-sm">{tutor.monthlyRate ? <><span className="text-muted-foreground">{t("শুরু ", "from ")}</span><b className="text-primary">{formatMoney(String(tutor.monthlyRate), lang)}</b></> : <span className="text-muted-foreground">{t("সম্মানী আলোচনাসাপেক্ষ", "Rate on request")}</span>}</span>
        <Link href={`/tutors/${tutor.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("প্রোফাইল", "Profile")}</Link>
      </div>
    </Card>
  );
}
