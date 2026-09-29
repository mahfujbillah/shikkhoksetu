import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CURRICULA, GENDER_PREF, gradeLabel, locationLabel, subjectLabel, TUITION_TYPES } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { getPost360 } from "@/server/services/crm";
import { adminCancelPostAction } from "@/server/actions/admin";
import { A, KV, NotesPanel, Section } from "@/components/admin/Crm";
import { ApplicationControls, PostEditForm, ReopenPost } from "@/components/admin/CrmForms";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminPost360({ params }: PageProps<"/admin/tuitions/[id]">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const data = await getPost360((await params).id);
  if (!data) notFound();
  const { post: p, notes } = data;
  const editable = p.status === "OPEN" || p.status === "SHORTLISTED";
  return (
    <div className="space-y-4">
      <Link href="/admin/tuitions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {t("সব টিউশন", "All tuitions")}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">#{formatNumber(p.number, lang)} · {p.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><StatusBadge status={p.status} lang={lang} /> {t("পোস্ট করেছেন", "Posted by")} <A href={`/admin/users/${p.guardian.id}`}>{p.guardian.fullName}</A> · {p.guardian.phone ?? p.guardian.email} · {timeAgo(p.createdAt, lang)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/tuitions/${p.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("পাবলিক পেজ", "Public page")}</Link>
          <Link href={`/dashboard/jobs/${p.id}/applicants`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("অভিভাবকের ভিউ", "Guardian view")}</Link>
          {editable && <ActionButton action={adminCancelPostAction} fields={{ postId: p.id }} size="sm" variant="destructive" confirm="Cancel this post?">{t("বাতিল করুন", "Cancel post")}</ActionButton>}
          {p.status === "CANCELLED" && <ReopenPost postId={p.id} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title={t("বিস্তারিত", "Details")}>
            <KV rows={[
              [t("শ্রেণি", "Grade"), `${gradeLabel(p.grade, lang)} · ${CURRICULA[p.curriculum]?.[lang] ?? p.curriculum}`],
              [t("বিষয়", "Subjects"), p.subjects.map((s) => subjectLabel(s, lang)).join(", ")],
              [t("ধরন", "Type"), TUITION_TYPES[p.tuitionType]?.[lang] ?? p.tuitionType],
              [t("স্থান", "Location"), locationLabel(p, lang)],
              [t("ঠিকানা (গোপন)", "Address (private)"), p.addressLine],
              [t("সপ্তাহে", "Per week"), `${p.daysPerWeek} ${t("দিন", "days")} · ${p.sessionMinutes} min · ${p.preferredTime ?? ""}`],
              [t("বেতন", "Budget"), `${p.budgetMin ? formatMoney(String(p.budgetMin), lang) + " – " : ""}${formatMoney(String(p.budgetMax), lang)}${p.salaryNegotiable ? " (negotiable)" : ""}`],
              [t("শিক্ষক পছন্দ", "Tutor gender"), GENDER_PREF[p.genderPreference]?.[lang]],
              [t("ছাত্র", "Student"), `${p.studentName ?? "—"} · ${p.studentsCount}`],
              [t("শুরু", "Start"), p.startDate ? formatDate(p.startDate, lang) : "—"],
              [t("প্রয়োজনীয়তা", "Requirements"), p.requirements],
              [t("শর্টলিস্ট", "Shortlist"), `${p.shortlistedCount} / ${p.maxShortlist}`],
            ]} />
          </Section>

          <Section title={`${t("আবেদনকারী", "Applicants")} (${p.applications.length})`}>
            {p.applications.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="divide-y divide-border text-sm">
                {p.applications.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/users/${a.tutorProfile.user.id}`}>{a.tutorProfile.user.fullName}</A><StatusBadge status={a.tutorProfile.verificationStatus} lang={lang} /><span className="text-muted-foreground">{a.tutorProfile.university} · {a.tutorProfile.user.phone ?? ""}</span></p>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{a.proposedSalary ? `${formatMoney(String(a.proposedSalary), lang)} · ` : ""}{a.coverNote}</p>
                      {a.trials.length > 0 && <p className="mt-1 text-xs">{t("ট্রায়াল", "Trials")}: {a.trials.map((tr) => `${formatDate(tr.scheduledAt, lang, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} ${tr.status}`).join(", ")}</p>}
                    </div>
                    <ApplicationControls id={a.id} status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {p.agreements.length > 0 && (
            <Section title={t("চুক্তি", "Agreements")}>
              <ul className="text-sm">{p.agreements.map((a) => <li key={a.id} className="flex items-center gap-2 py-1"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/agreements/${a.id}`}>#{a.agreementNumber}</A> {formatMoney(String(a.monthlySalary), lang)}</li>)}</ul>
            </Section>
          )}

          {editable && <Section title={t("পোস্ট সম্পাদনা", "Edit post")}><PostEditForm post={{ id: p.id, title: p.title, budgetMax: String(p.budgetMax), budgetMin: p.budgetMin ? String(p.budgetMin) : null, daysPerWeek: p.daysPerWeek, requirements: p.requirements, addressLine: p.addressLine, maxShortlist: p.maxShortlist }} /></Section>}
        </div>
        <div>
          <NotesPanel title={t("অ্যাডমিন নোট", "Admin notes")} entity="TuitionPost" entityId={p.id} notes={notes} when={(d) => timeAgo(d, lang)} />
        </div>
      </div>
    </div>
  );
}
