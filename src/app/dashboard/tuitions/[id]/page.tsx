import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck, ExternalLink, Phone, Wallet } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { getEngagement } from "@/server/services/engagement";
import { ConfirmSalaryButton, ConfirmSessionButton, EndEngagement, LinkLmsForm, LogSessionForm, ReviewForm, SalaryForm, ShareLmsForm } from "@/components/EngagementForms";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function EngagementPage({ params }: PageProps<"/dashboard/tuitions/[id]">) {
  const [{ id }, user, { t, lang }] = await Promise.all([params, requireUser(), getT()]);
  const res = await getEngagement(user, id).catch(() => null);
  if (!res) notFound();
  const { ag, role } = res;
  const active = ag.status === "ACTIVE";
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = ag.sessions.filter((s) => s.date.toISOString().startsWith(month));
  const done = thisMonth.filter((s) => s.status === "COMPLETED").length;
  const other = role === "TUTOR" ? { label: t("অভিভাবক", "Guardian"), ...ag.guardian } : { label: t("শিক্ষক", "Tutor"), ...ag.tutorProfile.user };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><StatusBadge status={ag.status} lang={lang} /><Link href={`/dashboard/agreements/${ag.id}`} className="text-xs text-primary hover:underline">{t("চুক্তি", "Agreement")} #{formatNumber(ag.agreementNumber, lang)}</Link></div>
            <h1 className="mt-1 font-display text-2xl font-bold">{ag.post.title}</h1>
            <p className="text-sm text-muted-foreground">{formatMoney(String(ag.monthlySalary), lang)}{t("/মাস", "/mo")} · {formatNumber(ag.daysPerWeek, lang)} {t("দিন/সপ্তাহ", "days/wk")} · {t("শুরু", "since")} {formatDate(ag.startDate, lang)}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <p className="text-xs text-muted-foreground">{other.label}</p>
            <p className="font-semibold">{other.fullName}</p>
            {other.phone && <a href={`tel:${other.phone}`} className="flex items-center gap-1 text-primary"><Phone className="size-3" /> {other.phone}</a>}
            {role === "TUTOR" && ag.post.addressLine && <p className="text-muted-foreground">{ag.post.addressLine}</p>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label={t("এই মাসে সম্পন্ন সেশন", "Sessions this month")} value={`${formatNumber(done, lang)} / ${formatNumber(ag.daysPerWeek * 4, lang)}`} />
          <Stat label={t("অভিভাবক-নিশ্চিত", "Guardian-confirmed")} value={formatNumber(ag.sessions.filter((s) => s.guardianConfirmed).length, lang)} />
          <Stat label={t("সার্ভিস চার্জ", "Service charge")} value={ag.paymentStatus === "PAID" ? t("পরিশোধিত", "Paid") : ag.paymentStatus === "WAIVED" ? t("মওকুফ", "Waived") : t("বকেয়া", "Due")} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-bold"><CalendarCheck className="size-4" /> {t("উপস্থিতি ও অগ্রগতি লগ", "Attendance & progress log")}</h2>
        {role === "TUTOR" && active && <div className="mt-4 rounded-xl border border-border p-4"><LogSessionForm agreementId={ag.id} minutes={ag.sessionMinutes} /></div>}
        <ul className="mt-4 divide-y divide-border text-sm">
          {ag.sessions.length === 0 && <li className="py-3 text-muted-foreground">{t("এখনো কোনো সেশন লগ হয়নি।", "No sessions logged yet.")}</li>}
          {ag.sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><b>{formatDate(s.date, lang)}</b> · {formatNumber(s.durationMinutes, lang)} {t("মিনিট", "min")} <StatusBadge status={s.status} lang={lang} />{s.topicsCovered && <p className="text-muted-foreground">{s.topicsCovered}{s.homework ? ` · HW: ${s.homework}` : ""}</p>}</div>
              {s.guardianConfirmed ? <span className="text-xs text-success">✓ {t("নিশ্চিত", "confirmed")}{s.studentRating ? ` · ${"★".repeat(s.studentRating)}` : ""}</span> : role === "GUARDIAN" ? <ConfirmSessionButton sessionId={s.id} agreementId={ag.id} /> : <span className="text-xs text-muted-foreground">{t("নিশ্চিতকরণ বাকি", "awaiting confirmation")}</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-bold"><Wallet className="size-4" /> {t("বেতন মাইলস্টোন", "Salary milestones")}</h2>
        {role === "GUARDIAN" && active && <div className="mt-4"><SalaryForm agreementId={ag.id} amount={Number(ag.monthlySalary)} /></div>}
        <ul className="mt-4 divide-y divide-border text-sm">
          {ag.salaryPayments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span><b>{p.periodMonth}</b> · {formatMoney(String(p.amount), lang)} <StatusBadge status={p.status} lang={lang} />{p.method ? ` · ${p.method}` : ""}</span>
              {p.status === "PAID" && (p.confirmedByTutor ? <span className="text-xs text-success">✓ {t("শিক্ষক নিশ্চিত করেছেন", "tutor confirmed")}</span> : role === "TUTOR" ? <ConfirmSalaryButton salaryId={p.id} agreementId={ag.id} /> : null)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-bold"><BookOpen className="size-4" /> {t("LMS রিসোর্স", "LMS resources")}</h2>
        <p className="text-sm text-muted-foreground">{t("শিক্ষক আপনার LMS-এর কোর্স ভিডিও, অ্যাসাইনমেন্ট ও নোট সরাসরি এখানে শেয়ার করেন।", "Tutors share LMS course videos, assignments and notes with the student here.")}</p>
        {role === "TUTOR" && active && <div className="mt-4 rounded-xl border border-border p-4"><ShareLmsForm agreementId={ag.id} /></div>}
        <ul className="mt-4 space-y-2 text-sm">
          {ag.lmsShares.length === 0 && <li className="text-muted-foreground">{t("এখনো কিছু শেয়ার হয়নি।", "Nothing shared yet.")}</li>}
          {ag.lmsShares.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5">
              <span><span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">{r.type}</span><b>{r.title}</b>{r.dueDate ? <span className="text-muted-foreground"> · {t("শেষ", "due")} {formatDate(r.dueDate, lang)}</span> : null}</span>
              <a href={r.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>{t("খুলুন", "Open")} <ExternalLink /></a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-bold"><BarChart3 className="size-4" /> {t("LMS পারফরম্যান্স", "LMS performance")}</h2>
        {role !== "TUTOR" && <div className="mt-3"><LinkLmsForm agreementId={ag.id} current={ag.lmsStudentId} /></div>}
        {!ag.lmsStudentId ? <p className="mt-3 text-sm text-muted-foreground">{t("শিক্ষার্থীর LMS আইডি যুক্ত করলে কোর্স অগ্রগতি, কুইজ ও অ্যাসাইনমেন্ট স্কোর এখানে দেখা যাবে।", "Link the student's LMS ID to see course completion, quiz and assignment scores here.")}</p>
          : ag.lmsProgress.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("LMS থেকে এখনো কোনো ডেটা আসেনি।", "No data received from the LMS yet.")}</p> : (
            <table className="mt-3 w-full text-sm"><tbody className="divide-y divide-border">
              {ag.lmsProgress.map((p) => <tr key={p.id}><td className="py-2">{p.courseTitle ?? p.courseId ?? "—"}</td><td className="py-2 text-muted-foreground">{p.metric}</td><td className="py-2 text-right font-semibold">{formatNumber(p.value.toFixed(1), lang)}</td><td className="py-2 text-right text-xs text-muted-foreground">{formatDate(p.recordedAt, lang)}</td></tr>)}
            </tbody></table>
          )}
      </Card>

      {role === "GUARDIAN" && (active || ag.status === "COMPLETED") && (
        <Card className="p-5">
          <h2 className="font-bold">{t("শিক্ষককে রিভিউ দিন", "Review your tutor")}</h2>
          {ag.review ? <p className="mt-2 text-sm">{"★".repeat(ag.review.rating)} · {ag.review.comment}</p> : <div className="mt-3"><ReviewForm agreementId={ag.id} /></div>}
        </Card>
      )}
      {active && <Card className="p-5"><h2 className="mb-3 font-bold">{t("টিউশন শেষ করা", "Ending the tuition")}</h2><EndEngagement agreementId={ag.id} /></Card>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl font-bold">{value}</p></div>;
}
