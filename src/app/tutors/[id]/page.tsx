import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BookOpen, GraduationCap, MapPin, Star, Wallet } from "lucide-react";
import { anyAreaLabel, cityLabel, CURRICULA, gradeLabel, subjectLabel, TUITION_TYPES } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { getPublicTutor } from "@/server/services/tutors";
import { initials } from "@/components/Cards";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function TutorProfile({ params }: PageProps<"/tutors/[id]">) {
  const { id } = await params;
  const tp = await getPublicTutor(id);
  if (!tp) notFound();
  const { t, lang } = await getT();
  const chips = (xs: string[]) => <div className="mt-2 flex flex-wrap gap-1.5">{xs.length ? xs.map((x) => <span key={x} className="rounded-full bg-muted px-3 py-1 text-sm">{x}</span>) : <span className="text-sm text-muted-foreground">—</span>}</div>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/tutors" className="text-sm font-semibold text-primary hover:underline">← {t("সব শিক্ষক", "All tutors")}</Link>
      <Card className="mt-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className={`grid size-20 place-items-center rounded-full font-display text-2xl font-bold ${tp.gender === "FEMALE" ? "bg-accent/20 text-accent-foreground" : "bg-primary/15 text-primary"}`}>{initials(tp.user.fullName)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-bold">{tp.user.fullName}{tp.verificationStatus === "VERIFIED" ? <Badge variant="verified"><BadgeCheck /> {t("যাচাইকৃত", "Verified")}</Badge> : <Badge variant="secondary">{t("যাচাই হয়নি", "Not verified")}</Badge>}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><GraduationCap className="size-4" /> {tp.university}{tp.department ? ` · ${tp.department}` : ""}{tp.degree ? ` · ${tp.degree}` : ""}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Star className="size-4 fill-accent text-accent" /> {formatNumber(Number(tp.ratingAvg).toFixed(1), lang)} ({formatNumber(tp.ratingCount, lang)} {t("রিভিউ", "reviews")}) · {formatNumber(tp.experienceYears, lang)} {t("বছরের অভিজ্ঞতা", "yrs experience")} · {formatNumber(tp.completedTuitions, lang)} {t("সম্পন্ন টিউশন", "completed tuitions")}</p>
          </div>
        </div>
        {tp.headline && <p className="mt-6 text-lg font-medium">{tp.headline}</p>}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div><h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><BookOpen className="size-4" /> {t("বিষয়", "Subjects")}</h3>{chips(tp.subjects.map((s) => subjectLabel(s, lang)))}</div>
          <div><h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><GraduationCap className="size-4" /> {t("শ্রেণি ও কারিকুলাম", "Classes & curricula")}</h3>{chips([...tp.grades.map((g) => gradeLabel(g, lang)), ...tp.curricula.map((c) => CURRICULA[c][lang])])}</div>
          <div><h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><MapPin className="size-4" /> {t("ধরন ও এলাকা", "Modes & areas")}</h3>{chips([...tp.tuitionTypes.map((x) => TUITION_TYPES[x][lang]), ...tp.preferredCities.map((c) => cityLabel(c, lang)), ...tp.preferredAreas.map((a) => anyAreaLabel(a, lang))])}</div>
          <div><h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Wallet className="size-4" /> {t("সম্মানী", "Rates")}</h3><p className="mt-2 font-bold text-primary">{tp.monthlyRate ? `${formatMoney(String(tp.monthlyRate), lang)}${t("/মাস", "/month")}` : "—"}{tp.hourlyRate ? ` · ${formatMoney(String(tp.hourlyRate), lang)}${t("/ঘণ্টা", "/hour")}` : ""}</p></div>
        </div>
        {tp.bio && <div className="mt-8 border-t border-border pt-6"><h2 className="font-semibold">{t("পরিচিতি", "About")}</h2><p className="mt-2 whitespace-pre-line text-muted-foreground">{tp.bio}</p></div>}
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="font-semibold">{t("অভিভাবকদের রিভিউ", "Guardian reviews")}</h2>
          {tp.reviews.length ? <ul className="mt-3 space-y-3">{tp.reviews.map((r, i) => <li key={i} className="rounded-xl bg-muted/60 p-3 text-sm"><span className="font-semibold">{"★".repeat(r.rating)}</span> · {r.author.fullName} · <span className="text-muted-foreground">{formatDate(r.createdAt, lang)}</span>{r.comment && <p className="mt-1">{r.comment}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{t("এখনো রিভিউ নেই।", "No reviews yet.")}</p>}
        </div>
        <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("শিক্ষকের ফোন নম্বর সুরক্ষিত — টিউশন পোস্ট করুন, এই শিক্ষক আবেদন করলে শর্টলিস্ট ও ট্রায়াল নিতে পারবেন।", "Contact details are protected — post a tuition; if this tutor applies you can shortlist and trial them.")}</p>
      </Card>
    </div>
  );
}
