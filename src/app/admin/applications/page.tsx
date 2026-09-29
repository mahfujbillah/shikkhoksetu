import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, Table, Td } from "@/components/admin/Crm";
import { ApplicationControls } from "@/components/admin/CrmForms";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["PENDING", "SHORTLISTED", "CONFIRMED", "REJECTED", "WITHDRAWN"] as const;

export default async function AdminApplications({ searchParams }: PageProps<"/admin/applications">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const status = one(sp.status) as (typeof STATUSES)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const where: Prisma.TuitionApplicationWhereInput = status && STATUSES.includes(status) ? { status } : {};
  const [apps, total] = await Promise.all([
    db.tuitionApplication.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { post: { select: { id: true, number: true, title: true } }, tutorProfile: { select: { verificationStatus: true, user: { select: { id: true, fullName: true } } } } } }),
    db.tuitionApplication.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("সব আবেদন", "All applications")}><ExportLink entity="applications" query={{ status }} /></CrmHeader>
      <FilterPills base="/admin/applications" param="status" value={status} sp={sp} options={[["", t("সব", "All")], ...STATUSES.map((s) => [s, s] as [string, string])]} />
      <Table head={[t("শিক্ষক", "Tutor"), t("টিউশন", "Tuition"), t("প্রস্তাবিত বেতন", "Proposed"), t("পিচ", "Pitch"), t("অবস্থা", "Status"), ""]} empty={apps.length === 0}>
        {apps.map((a) => (
          <tr key={a.id} className="hover:bg-muted/40">
            <Td><A href={`/admin/users/${a.tutorProfile.user.id}`}>{a.tutorProfile.user.fullName}</A><br /><StatusBadge status={a.tutorProfile.verificationStatus} lang={lang} /></Td>
            <Td><A href={`/admin/tuitions/${a.post.id}`}>#{formatNumber(a.post.number, lang)}</A> {a.post.title}<p className="text-xs text-muted-foreground">{timeAgo(a.createdAt, lang)}</p></Td>
            <Td>{a.proposedSalary ? formatMoney(String(a.proposedSalary), lang) : "—"}</Td>
            <Td className="max-w-xs"><p className="line-clamp-2 text-muted-foreground">{a.coverNote}</p></Td>
            <Td><StatusBadge status={a.status} lang={lang} /></Td>
            <Td><ApplicationControls id={a.id} status={a.status} /></Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/applications" sp={sp} page={page} total={total} />
    </>
  );
}
