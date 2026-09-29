import Link from "next/link";
import { db } from "@/lib/db";
import { gradeLabel, locationLabel } from "@/lib/catalog";
import { formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { adminCancelPostAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AdminTuitions() {
  await requireAdmin();
  const { t, lang } = await getT();
  const posts = await db.tuitionPost.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { guardian: { select: { fullName: true, phone: true } } } });
  return (
    <Card className="divide-y divide-border">
      {posts.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="min-w-0">
            <p className="font-semibold"><StatusBadge status={p.status} lang={lang} /> #{formatNumber(p.number, lang)} · {p.title}</p>
            <p className="text-muted-foreground">{gradeLabel(p.grade, lang)} · {locationLabel(p, lang)} · {formatMoney(String(p.budgetMax), lang)} · {p.applicationsCount} {t("আবেদন", "applicants")} · {p.guardian.fullName} {p.guardian.phone ?? ""} · {timeAgo(p.createdAt, lang)}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/jobs/${p.id}/applicants`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("আবেদনকারী", "Applicants")}</Link>
            {(p.status === "OPEN" || p.status === "SHORTLISTED") && <ActionButton action={adminCancelPostAction} fields={{ postId: p.id }} size="sm" variant="destructive" confirm="Cancel this post?">{t("বাতিল", "Cancel")}</ActionButton>}
          </div>
        </div>
      ))}
    </Card>
  );
}
