import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, FilterPills, one, Pager, paging, Table, Td } from "@/components/admin/Crm";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;

export default async function AdminTrials({ searchParams }: PageProps<"/admin/trials">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const status = one(sp.status) as (typeof STATUSES)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const where: Prisma.TrialSessionWhereInput = status && STATUSES.includes(status) ? { status } : {};
  const [trials, total] = await Promise.all([
    db.trialSession.findMany({ where, orderBy: { scheduledAt: "desc" }, skip, take, include: { application: { select: { post: { select: { id: true, number: true, title: true, guardian: { select: { id: true, fullName: true } } } }, tutorProfile: { select: { user: { select: { id: true, fullName: true } } } } } } } }),
    db.trialSession.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("ট্রায়াল ক্লাস", "Trial classes")} />
      <FilterPills base="/admin/trials" param="status" value={status} sp={sp} options={[["", t("সব", "All")], ...STATUSES.map((s) => [s, s] as [string, string])]} />
      <Table head={[t("সময়", "When"), t("টিউশন", "Tuition"), t("শিক্ষক", "Tutor"), t("অভিভাবক", "Guardian"), t("মোড", "Mode"), t("ফি", "Fee"), t("অবস্থা", "Status"), t("মতামত", "Feedback")]} empty={trials.length === 0}>
        {trials.map((x) => (
          <tr key={x.id} className="hover:bg-muted/40">
            <Td className="whitespace-nowrap">{formatDate(x.scheduledAt, lang, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}<br /><span className="text-xs text-muted-foreground">{x.durationMinutes} min</span></Td>
            <Td><A href={`/admin/tuitions/${x.application.post.id}`}>#{formatNumber(x.application.post.number, lang)}</A></Td>
            <Td><A href={`/admin/users/${x.application.tutorProfile.user.id}`}>{x.application.tutorProfile.user.fullName}</A></Td>
            <Td><A href={`/admin/users/${x.application.post.guardian.id}`}>{x.application.post.guardian.fullName}</A></Td>
            <Td className="text-xs">{x.mode}{x.meetingLink ? <><br /><a href={x.meetingLink} target="_blank" rel="noreferrer" className="text-primary underline">link</a></> : x.location ? <><br />{x.location}</> : null}</Td>
            <Td>{x.isPaid && x.fee ? formatMoney(String(x.fee), lang) : t("ফ্রি", "Free")}</Td>
            <Td><StatusBadge status={x.status} lang={lang} /></Td>
            <Td className="max-w-xs text-xs text-muted-foreground">{x.guardianRating ? `${"★".repeat(x.guardianRating)} ` : ""}{x.guardianFeedback}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/trials" sp={sp} page={page} total={total} />
    </>
  );
}
