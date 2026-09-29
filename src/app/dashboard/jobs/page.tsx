import Link from "next/link";
import { db } from "@/lib/db";
import { gradeLabel, locationLabel } from "@/lib/catalog";
import { formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { Empty, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function MyJobs() {
  const user = await requireUser(["STUDENT_GUARDIAN"]);
  const { t, lang } = await getT();
  const posts = await db.tuitionPost.findMany({ where: { guardianId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title={t("আমার টিউশন পোস্ট", "My tuition posts")}><Link href="/post-tuition" className={buttonVariants({ variant: "accent" })}>{t("নতুন পোস্ট", "New post")}</Link></PageHeader>
      {posts.length === 0 ? <Empty>{t("এখনো কোনো পোস্ট নেই।", "No posts yet.")}</Empty> : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><StatusBadge status={p.status} lang={lang} /><span className="text-xs text-muted-foreground">#{formatNumber(p.number, lang)} · {timeAgo(p.createdAt, lang)}</span></div>
                <p className="mt-1 font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{gradeLabel(p.grade, lang)} · {locationLabel(p, lang)}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span><b>{formatNumber(p.applicationsCount, lang)}</b> {t("আবেদন", "applicants")} · <b>{formatNumber(p.shortlistedCount, lang)}</b>/{formatNumber(p.maxShortlist, lang)} {t("শর্টলিস্ট", "shortlisted")}</span>
                <Link href={`/dashboard/jobs/${p.id}/applicants`} className={buttonVariants({ size: "sm" })}>{t("আবেদনকারী দেখুন", "Review applicants")}</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
