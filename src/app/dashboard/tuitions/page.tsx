import Link from "next/link";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { listMyEngagements } from "@/server/services/engagement";
import { Empty, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function MyTuitions() {
  const user = await requireUser();
  const { t, lang } = await getT();
  const list = await listMyEngagements(user);
  return (
    <>
      <PageHeader title={t("চলমান টিউশন", "Active tuitions")} desc={t("সেশন লগ, বেতন, LMS রিসোর্স ও অগ্রগতি — এক জায়গায়।", "Session logs, salary, LMS resources and progress — in one place.")} />
      {list.length === 0 ? <Empty>{t("এখনো কোনো নিশ্চিত টিউশন নেই।", "No confirmed tuitions yet.")}</Empty> : (
        <div className="space-y-3">
          {list.map((a) => {
            const other = a.guardianId === user.id ? a.tutorProfile.user.fullName : a.guardian.fullName;
            const href = a.status === "PENDING_SIGNATURES" ? `/dashboard/agreements/${a.id}` : `/dashboard/tuitions/${a.id}`;
            return (
              <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2"><StatusBadge status={a.status} lang={lang} /><span className="text-xs text-muted-foreground">#{formatNumber(a.agreementNumber, lang)}</span></div>
                  <p className="mt-1 font-semibold">{a.post.title}</p>
                  <p className="text-sm text-muted-foreground">{other} · {formatMoney(String(a.monthlySalary), lang)}{t("/মাস", "/mo")} · {t("শুরু", "from")} {formatDate(a.startDate, lang)} · {formatNumber(a._count.sessions, lang)} {t("সেশন", "sessions")}</p>
                </div>
                <Link href={href} className={buttonVariants({ size: "sm" })}>{t("খুলুন", "Open")}</Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
