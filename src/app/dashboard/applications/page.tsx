import Link from "next/link";
import { ExternalLink, Video } from "lucide-react";
import { gradeLabel, locationLabel } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { listMyApplications } from "@/server/services/applications";
import { withdrawAction } from "@/server/actions/marketplace";
import { ActionButton } from "@/components/FormBits";
import { Empty, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function MyApplications() {
  const user = await requireUser(["TUTOR"]);
  const { t, lang } = await getT();
  const apps = await listMyApplications(user);
  return (
    <>
      <PageHeader title={t("আমার আবেদন", "My applications")}><Link href="/tuitions" className={buttonVariants({ variant: "accent" })}>{t("আরও জব", "Find more jobs")}</Link></PageHeader>
      {apps.length === 0 ? <Empty>{t("এখনো কোনো আবেদন করেননি।", "You haven't applied to any tuition yet.")}</Empty> : (
        <div className="space-y-3">
          {apps.map((a) => {
            const trial = a.trials[0];
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><StatusBadge status={a.status} lang={lang} /><span className="text-xs text-muted-foreground">#{formatNumber(a.post.number, lang)} · {t("আবেদন", "applied")} {timeAgo(a.createdAt, lang)}</span></div>
                    <Link href={`/tuitions/${a.post.id}`} className="mt-1 block font-semibold hover:text-primary">{a.post.title}</Link>
                    <p className="text-sm text-muted-foreground">{gradeLabel(a.post.grade, lang)} · {locationLabel(a.post, lang)} · {formatMoney(String(a.post.budgetMax), lang)}{t("/মাস", "/mo")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.agreement && <Link href={a.agreement.status === "ACTIVE" ? `/dashboard/tuitions/${a.agreement.id}` : `/dashboard/agreements/${a.agreement.id}`} className={buttonVariants({ size: "sm" })}>{a.agreement.status === "PENDING_SIGNATURES" ? t("চুক্তিতে স্বাক্ষর করুন", "Review & sign offer") : t("টিউশন দেখুন", "Open tuition")}</Link>}
                    {(a.status === "PENDING" || a.status === "SHORTLISTED") && !a.agreement && <ActionButton action={withdrawAction} fields={{ applicationId: a.id }} size="sm" variant="ghost" confirm={t("আবেদন প্রত্যাহার করবেন?", "Withdraw this application?")}>{t("প্রত্যাহার", "Withdraw")}</ActionButton>}
                  </div>
                </div>
                {trial && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5 text-sm">
                    <span>{t("ট্রায়াল ক্লাস", "Trial class")}: <b>{formatDate(trial.scheduledAt, lang, { dateStyle: "medium", timeStyle: "short" })}</b> <StatusBadge status={trial.status} lang={lang} /></span>
                    {trial.meetingLink && trial.status === "SCHEDULED" && <a href={trial.meetingLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}><Video /> {t("যোগ দিন", "Join")} <ExternalLink /></a>}
                    {trial.location && <span className="text-muted-foreground">{trial.location}</span>}
                  </div>
                )}
                {a.status === "REJECTED" && a.rejectionReason && <p className="mt-2 text-xs text-muted-foreground">{a.rejectionReason}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
