import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, GraduationCap, MapPin, Users } from "lucide-react";
import { CURRICULA, GENDER_PREF, gradeLabel, locationLabel, subjectLabel, TUITION_TYPES } from "@/lib/catalog";
import { formatDate, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { getPublicPost } from "@/server/services/posts";
import { getApplyViewer } from "@/server/viewer";
import { ApplyDialog } from "@/components/ApplyDialog";
import { salaryText } from "@/components/Cards";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function TuitionDetail({ params }: PageProps<"/tuitions/[id]">) {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) notFound();
  const [{ t, lang }, viewer] = await Promise.all([getT(), getApplyViewer([post.id])]);
  const rows: [React.ReactNode, string, string][] = [
    [<GraduationCap key="g" />, t("শ্রেণি", "Class"), `${gradeLabel(post.grade, lang)} · ${CURRICULA[post.curriculum][lang]}`],
    [<MapPin key="m" />, t("ধরন ও লোকেশন", "Mode & location"), `${TUITION_TYPES[post.tuitionType][lang]} · ${locationLabel(post, lang)}`],
    [<CalendarDays key="c" />, t("সময়সূচি", "Schedule"), `${formatNumber(post.daysPerWeek, lang)} ${t("দিন/সপ্তাহ", "days/week")}${post.preferredTime ? ` · ${post.preferredTime}` : ""}`],
    [<Clock key="k" />, t("প্রতি সেশন", "Per session"), `${formatNumber(post.sessionMinutes, lang)} ${t("মিনিট", "minutes")}`],
    [<Users key="u" />, t("শিক্ষার্থী ও শিক্ষক", "Students & tutor"), `${formatNumber(post.studentsCount, lang)} ${t("জন", "student(s)")} · ${t("শিক্ষক", "tutor")}: ${GENDER_PREF[post.genderPreference][lang]}`],
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/tuitions" className="text-sm font-semibold text-primary hover:underline">← {t("জব বোর্ড", "Job board")}</Link>
      <Card className="mt-4 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5"><Badge>{TUITION_TYPES[post.tuitionType][lang]}</Badge><Badge variant="secondary">#{formatNumber(post.number, lang)}</Badge>{post.status === "SHORTLISTED" && <Badge variant="warning">{t("শর্টলিস্টিং চলছে", "Shortlisting in progress")}</Badge>}</div>
            <h1 className="mt-3 font-display text-3xl font-bold">{post.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("পোস্ট", "Posted")} {timeAgo(post.createdAt, lang)}{post.startDate ? ` · ${t("শুরু", "Starts")} ${formatDate(post.startDate, lang)}` : ""}</p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-primary">{salaryText(post, lang)}</div>
            <div className="text-sm text-muted-foreground">{t("প্রতি মাসে", "per month")}{post.salaryNegotiable ? t(" · আলোচনাসাপেক্ষ", " · negotiable") : ""}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-1.5">{post.subjects.map((s) => <span key={s} className="rounded-full border border-border px-3 py-1 text-sm">{subjectLabel(s, lang)}</span>)}</div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {rows.map(([icon, k, v]) => (
            <div key={k} className="flex gap-3"><span className="mt-0.5 text-primary [&_svg]:size-5">{icon}</span><div><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div></div>
          ))}
        </dl>
        {post.requirements && (<div className="mt-6 border-t border-border pt-6"><h2 className="font-semibold">{t("অভিভাবকের প্রত্যাশা", "Guardian's requirements")}</h2><p className="mt-2 whitespace-pre-line text-muted-foreground">{post.requirements}</p></div>)}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">{t("ঠিকানা ও ফোন নম্বর চুক্তি স্বাক্ষরের পর দেখা যাবে", "Address & phone are shared after the agreement is signed")}</p>
          <div className="w-full sm:w-auto sm:min-w-80"><ApplyDialog post={{ id: post.id, title: post.title, budgetMax: Number(post.budgetMax), genderPreference: post.genderPreference, status: post.status, guardianId: post.guardianId, applicationsCount: post.applicationsCount }} viewer={viewer} showMeter /></div>
        </div>
      </Card>
    </div>
  );
}
