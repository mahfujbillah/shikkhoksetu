import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, Table, Td } from "@/components/admin/Crm";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["PENDING_SIGNATURES", "ACTIVE", "COMPLETED", "TERMINATED", "CANCELLED"] as const;

export default async function AdminAgreements({ searchParams }: PageProps<"/admin/agreements">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const status = one(sp.status) as (typeof STATUSES)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const where: Prisma.TuitionAgreementWhereInput = status && STATUSES.includes(status) ? { status } : {};
  const [rows, total] = await Promise.all([
    db.tuitionAgreement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { guardian: { select: { id: true, fullName: true } }, tutorProfile: { select: { user: { select: { id: true, fullName: true } } } }, post: { select: { id: true, number: true } } } }),
    db.tuitionAgreement.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("চুক্তি", "Agreements")}><ExportLink entity="agreements" query={{ status }} /></CrmHeader>
      <FilterPills base="/admin/agreements" param="status" value={status} sp={sp} options={[["", t("সব", "All")], ...STATUSES.map((s) => [s, s] as [string, string])]} />
      <Table head={["#", t("অভিভাবক", "Guardian"), t("শিক্ষক", "Tutor"), t("বেতন", "Salary"), t("কমিশন", "Commission"), t("শুরু", "Start"), t("অবস্থা", "Status")]} empty={rows.length === 0}>
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-muted/40">
            <Td><A href={`/admin/agreements/${a.id}`}>#{a.agreementNumber}</A><p className="text-xs text-muted-foreground">{t("টিউশন", "job")} #{formatNumber(a.post.number, lang)}</p></Td>
            <Td><A href={`/admin/users/${a.guardian.id}`}>{a.guardian.fullName}</A></Td>
            <Td><A href={`/admin/users/${a.tutorProfile.user.id}`}>{a.tutorProfile.user.fullName}</A></Td>
            <Td>{formatMoney(String(a.monthlySalary), lang)}</Td>
            <Td>{formatMoney(String(a.commissionAmount), lang)} <span className="text-xs text-muted-foreground">({a.commissionPayer} · {a.paymentStatus})</span></Td>
            <Td className="whitespace-nowrap">{formatDate(a.startDate, lang)}</Td>
            <Td><StatusBadge status={a.status} lang={lang} /></Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/agreements" sp={sp} page={page} total={total} />
    </>
  );
}
