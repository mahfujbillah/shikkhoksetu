import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, FileSignature } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { getAgreementForParty } from "@/server/services/hiring";
import { PrintButton, SignAgreement } from "@/components/SignAgreement";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AgreementPage({ params, searchParams }: PageProps<"/dashboard/agreements/[id]">) {
  const [{ id }, sp, user, { t, lang }] = await Promise.all([params, searchParams, requireUser(), getT()]);
  const res = await getAgreementForParty(user, id).catch(() => null);
  if (!res) notFound();
  const { agreement: a, viewerRole, contactsVisible } = res;
  const sig = (label: string, name: string | null, at: Date | null, ip: string | null) => (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {at ? <><p className="mt-1 font-display text-xl italic">{name}</p><p className="text-xs text-muted-foreground">{formatDate(at, lang, { dateStyle: "medium", timeStyle: "short" })}{ip ? ` · IP ${ip}` : ""}</p></> : <p className="mt-1 text-sm text-muted-foreground">{t("স্বাক্ষর বাকি", "Not signed yet")}</p>}
    </div>
  );
  return (
    <>
      {sp.generated && <p className="no-print mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("চুক্তি তৈরি ও আপনার স্বাক্ষর সম্পন্ন। শিক্ষক স্বাক্ষর করলে নিয়োগ নিশ্চিত হবে।", "Agreement generated and signed by you. The hire is confirmed once the tutor signs.")}</p>}
      {sp.signed && <p className="no-print mb-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success"><CheckCircle2 className="size-4" /> {t("নিয়োগ নিশ্চিত! যোগাযোগের তথ্য এখন দেখা যাচ্ছে।", "Hire confirmed! Contact details are now visible.")}</p>}
      <Card className="print-sheet p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><FileSignature className="size-4" /> {t("টিউশন চুক্তি / নিয়োগপত্র", "Tuition agreement / confirmation letter")}</p>
            <h1 className="mt-1 font-display text-2xl font-bold">#{formatNumber(a.agreementNumber, lang)} · {a.post.title}</h1>
          </div>
          <div className="flex items-center gap-2"><StatusBadge status={a.status} lang={lang} /><PrintButton /></div>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">{t("মাসিক সম্মানী", "Monthly salary")}</dt><dd className="text-lg font-bold">{formatMoney(String(a.monthlySalary), lang)}</dd></div>
          <div><dt className="text-muted-foreground">{t("সময়সূচি", "Schedule")}</dt><dd className="font-semibold">{formatNumber(a.daysPerWeek, lang)} {t("দিন/সপ্তাহ", "days/week")} · {formatNumber(a.sessionMinutes, lang)} {t("মিনিট", "min")}</dd></div>
          <div><dt className="text-muted-foreground">{t("প্ল্যাটফর্ম সার্ভিস চার্জ", "Platform service charge")}</dt><dd className="font-semibold">{formatMoney(String(a.commissionAmount), lang)} ({formatNumber(Number(a.commissionRate), lang)}%) · {a.commissionPayer === "TUTOR" ? t("শিক্ষক দেবেন", "paid by tutor") : t("অভিভাবক দেবেন", "paid by guardian")}</dd></div>
        </dl>
        <pre className="mt-6 whitespace-pre-wrap rounded-xl bg-muted/50 p-5 font-sans text-sm leading-relaxed">{a.terms}</pre>
        {contactsVisible && (
          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">{t("অভিভাবক", "Guardian")}</p><p className="font-semibold">{a.guardian.fullName}</p><p>{a.guardian.phone} · {a.guardian.email}</p>{a.post.addressLine && <p className="text-muted-foreground">{a.post.addressLine}</p>}</div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">{t("শিক্ষক", "Tutor")}</p><p className="font-semibold">{a.tutorProfile.user.fullName}</p><p>{a.tutorProfile.user.phone} · {a.tutorProfile.user.email}</p></div>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sig(t("অভিভাবকের স্বাক্ষর", "Guardian signature"), a.guardianSignature, a.guardianSignedAt, a.guardianSignedIp)}
          {sig(t("শিক্ষকের স্বাক্ষর", "Tutor signature"), a.tutorSignature, a.tutorSignedAt, a.tutorSignedIp)}
        </div>
        {a.status === "PENDING_SIGNATURES" && <div className="no-print mt-6"><SignAgreement agreementId={a.id} name={a.tutorProfile.user.fullName} canSign={viewerRole === "TUTOR"} /></div>}
        {a.status === "ACTIVE" && <div className="no-print mt-6 flex gap-2"><Link href={`/dashboard/tuitions/${a.id}`} className={buttonVariants()}>{t("টিউশন ড্যাশবোর্ড", "Tuition dashboard")}</Link>{a.invoices.length > 0 && <Link href="/dashboard/invoices" className={buttonVariants({ variant: "outline" })}>{t("ইনভয়েস", "Invoices")}</Link>}</div>}
      </Card>
    </>
  );
}
