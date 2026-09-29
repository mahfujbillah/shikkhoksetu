import Link from "next/link";
import { BadgeCheck, CalendarDays, Clock, GraduationCap, Home, Laptop, MapPin, Star, UserRound, Users } from "lucide-react";
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

function postedAgo(d: Date, lang: Lang) {
  const t = makeT(lang);
  return t(`পোস্ট করা হয়েছে ${timeAgo(d, lang)}`, `Posted ${timeAgo(d, lang)}`);
}

/**
 * Job card used on the board and the home page (Caretutors-style):
 * Job ID · posted time · mode · class & curriculum · location · days/week · student & preferred tutor gender · live "x/10 applied".
 */
export function TuitionCard({ post, lang, viewer }: { post: PublicPost; lang: Lang; viewer: ApplyViewer }) {
  const t = makeT(lang);
  const online = post.isOnline || post.tuitionType === "ONLINE_ONE_TO_ONE";
  const ModeIcon = online ? Laptop : post.tuitionType === "GROUP_BATCH" ? Users : Home;
  const studentGender = post.studentGender ? (post.studentGender === "FEMALE" ? t("ছাত্রী", "Female") : t("ছাত্র", "Male")) : t("উল্লেখ নেই", "Not specified");
  const facts: [React.ElementType, string, string][] = [
    [GraduationCap, t("শ্রেণি", "Class"), `${gradeLabel(post.grade, lang)} · ${CURRICULA[post.curriculum][lang]}`],
    [MapPin, t("লোকেশন", "Location"), locationLabel(post, lang)],
    [CalendarDays, t("সপ্তাহে", "Days/week"), `${formatNumber(post.daysPerWeek, lang)} ${t("দিন", "days")} · ${formatNumber(post.sessionMinutes, lang)} ${t("মিনিট", "min")}`],
    [UserRound, t("শিক্ষার্থী", "Student"), `${studentGender}${post.studentsCount > 1 ? ` · ${formatNumber(post.studentsCount, lang)} ${t("জন", "students")}` : ""}`],
    [Users, t("পছন্দের শিক্ষক", "Preferred tutor"), GENDER_PREF[post.genderPreference][lang]],
  ];
  return (
    <Card className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono font-semibold text-foreground/80">{t("জব আইডি", "Job ID")}: {formatNumber(post.number, lang)}</span>
        <time dateTime={post.createdAt.toISOString()} title={post.createdAt.toISOString()} className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3.5" /> {postedAgo(post.createdAt, lang)}</time>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={online ? "default" : "secondary"}><ModeIcon /> {online ? t("অনলাইন", "Online") : post.tuitionType === "GROUP_BATCH" ? TUITION_TYPES.GROUP_BATCH[lang] : t("হোম", "Home")}</Badge>
            {post.status === "SHORTLISTED" && <Badge variant="warning">{t("শর্টলিস্ট চলছে", "Shortlisting")}</Badge>}
          </div>
          <Link href={`/tuitions/${post.id}`} className="mt-2 block font-bold leading-snug hover:text-primary">{post.title}</Link>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-bold text-primary">{salaryText(post, lang)}</div>
          <div className="text-xs text-muted-foreground">{t("/মাস", "/month")}{post.salaryNegotiable ? t(" · আলোচনাসাপেক্ষ", " · negotiable") : ""}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.subjects.map((s) => <span key={s} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{subjectLabel(s, lang)}</span>)}
      </div>

      <dl className="mt-4 grid gap-1.5 text-sm">
        {facts.map(([Icon, label, value]) => (
          <div key={label} className="flex items-start gap-2">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto border-t border-border pt-4 [&]:mt-5">
        <ApplyDialog showMeter post={{ id: post.id, title: post.title, budgetMax: Number(post.budgetMax), genderPreference: post.genderPreference, status: post.status, guardianId: post.guardianId, applicationsCount: post.applicationsCount }} viewer={viewer} />
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
