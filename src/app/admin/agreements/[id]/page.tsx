import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { gradeLabel, subjectLabel } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { getAgreement360 } from "@/server/services/crm";
import { manualPaymentAction, voidInvoiceAction } from "@/server/actions/admin";
import { A, KV, NotesPanel, Section } from "@/components/admin/Crm";
import { AgreementControls, DeleteReview } from "@/components/admin/CrmForms";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminAgreement360({ params }: PageProps<"/admin/agreements/[id]">) {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const data = await getAgreement360((await params).id);
  if (!data) notFound();
  const { ag, notes } = data;
  const tutor = ag.tutorProfile.user;
  return (
    <div className="space-y-4">
      <Link href="/admin/agreements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {t("সব চুক্তি", "All agreements")}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">{t("চুক্তি", "Agreement")} #{ag.agreementNumber} <StatusBadge status={ag.status} lang={lang} /></h2>
          <p className="text-sm text-muted-foreground"><A href={`/admin/users/${ag.guardian.id}`}>{ag.guardian.fullName}</A> ↔ <A href={`/admin/users/${tutor.id}`}>{tutor.fullName}</A> · {t("টিউশন", "job")} <A href={`/admin/tuitions/${ag.post.id}`}>#{formatNumber(ag.post.number, lang)}</A></p>
        </div>
        <Link href={`/dashboard/agreements/${ag.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("চুক্তিপত্র দেখুন / প্রিন্ট", "View / print document")}</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title={t("নিয়ন্ত্রণ", "Controls")}><AgreementControls id={ag.id} status={ag.status} /></Section>
          <Section title={t("শর্তাবলি", "Terms")}>
            <KV rows={[
              [t("বেতন", "Monthly salary"), formatMoney(String(ag.monthlySalary), lang)],
              [t("সময়সূচি", "Schedule"), `${ag.daysPerWeek} ${t("দিন/সপ্তাহ", "days/week")} · ${ag.sessionMinutes} min`],
              [t("শুরু", "Start"), formatDate(ag.startDate, lang)],
              [t("বিষয়", "Subjects"), `${gradeLabel(ag.grade, lang)} · ${ag.subjects.map((s) => subjectLabel(s, lang)).join(", ")}`],
              [t("স্থান", "Location"), ag.location ?? ag.post.addressLine],
              [t("কমিশন", "Commission"), `${String(ag.commissionRate)}% = ${formatMoney(String(ag.commissionAmount), lang)} · ${ag.commissionPayer} · ${ag.paymentStatus}`],
              [t("অভিভাবক স্বাক্ষর", "Guardian signed"), ag.guardianSignedAt ? `${ag.guardianSignature} · ${formatDate(ag.guardianSignedAt, lang, { dateStyle: "medium", timeStyle: "short" })} · IP ${ag.guardianSignedIp ?? "—"}` : "—"],
              [t("শিক্ষক স্বাক্ষর", "Tutor signed"), ag.tutorSignedAt ? `${ag.tutorSignature} · ${formatDate(ag.tutorSignedAt, lang, { dateStyle: "medium", timeStyle: "short" })} · IP ${ag.tutorSignedIp ?? "—"}` : "—"],
              [t("যোগাযোগ", "Contacts"), `${ag.guardian.phone ?? ag.guardian.email} / ${tutor.phone ?? tutor.email}`],
              [t("শেষ", "Ended"), ag.endedAt ? `${formatDate(ag.endedAt, lang)} · ${ag.endReason ?? ""}` : "—"],
              ["LMS student", ag.lmsStudentId],
            ]} />
          </Section>

          <Section title={t("ইনভয়েস ও লেনদেন", "Invoices & transactions")}>
            {ag.invoices.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="divide-y divide-border text-sm">
                {ag.invoices.map((i) => (
                  <li key={i.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex flex-wrap items-center gap-2"><StatusBadge status={i.status} lang={lang} /><span className="font-mono">{i.invoiceNumber}</span> {formatMoney(String(i.amount), lang)} · {t("শেষ", "due")} {formatDate(i.dueDate, lang)}</span>
                      {(i.status === "ISSUED" || i.status === "OVERDUE") && <span className="flex gap-1"><ActionButton action={manualPaymentAction} fields={{ invoiceId: i.id, reference: "manual/cash" }} size="sm" confirm="Record as paid?">{t("পরিশোধিত", "Mark paid")}</ActionButton><ActionButton action={voidInvoiceAction} fields={{ invoiceId: i.id, reason: "Waived by admin" }} size="sm" variant="ghost" confirm="Void?">{t("মওকুফ", "Void")}</ActionButton></span>}
                    </div>
                    {i.transactions.map((x) => <p key={x.id} className="ml-2 text-xs text-muted-foreground">↳ {x.provider} · {x.status} · {x.tranId} · {timeAgo(x.createdAt, lang)}</p>)}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`${t("ক্লাস লগ", "Session log")} (${ag.sessions.length})`}>
            {ag.sessions.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="divide-y divide-border text-sm">{ag.sessions.map((s) => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{formatDate(s.date, lang)} · {s.durationMinutes} min · {s.status} · {s.topicsCovered}</span><span className={s.guardianConfirmed ? "text-success" : "text-muted-foreground"}>{s.guardianConfirmed ? "✓ confirmed" : "unconfirmed"}</span></li>)}</ul>
            )}
          </Section>

          <Section title={t("বেতন পরিশোধ", "Salary payments")}>
            {ag.salaryPayments.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="divide-y divide-border text-sm">{ag.salaryPayments.map((s) => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{s.periodMonth} · {formatMoney(String(s.amount), lang)} · {s.method ?? ""}</span><span><StatusBadge status={s.status} lang={lang} /> {s.confirmedByTutor ? "✓ tutor" : ""}</span></li>)}</ul>
            )}
          </Section>

          {(ag.lmsShares.length > 0 || ag.lmsProgress.length > 0) && (
            <Section title="LMS">
              <ul className="space-y-1 text-sm">
                {ag.lmsShares.map((r) => <li key={r.id}>📎 {r.type} · <a href={r.url} target="_blank" rel="noreferrer" className="text-primary underline">{r.title}</a></li>)}
                {ag.lmsProgress.map((p) => <li key={p.id} className="text-muted-foreground">📈 {p.courseTitle ?? p.courseId} · {p.metric} = {p.value} · {timeAgo(p.recordedAt, lang)}</li>)}
              </ul>
            </Section>
          )}

          {ag.review && <Section title={t("রিভিউ", "Review")} action={me.isSuperAdmin ? <DeleteReview id={ag.review.id} /> : undefined}><p className="text-sm">{"★".repeat(ag.review.rating)} {ag.review.comment}</p></Section>}
        </div>
        <div className="space-y-4">
          <NotesPanel title={t("অ্যাডমিন নোট", "Admin notes")} entity="TuitionAgreement" entityId={ag.id} notes={notes} when={(d) => timeAgo(d, lang)} />
          <Section title={t("চুক্তির পূর্ণ লেখা", "Full signed text")}><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{ag.terms}</pre></Section>
        </div>
      </div>
    </div>
  );
}
