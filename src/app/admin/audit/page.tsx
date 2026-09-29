import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, SearchBox, Table, Td } from "@/components/admin/Crm";

const LINK: Record<string, string> = { User: "/admin/users/", TuitionPost: "/admin/tuitions/", TuitionAgreement: "/admin/agreements/" };

export default async function AdminAudit({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 60);
  const entity = one(sp.entity);
  const { page, skip, take } = paging(sp);
  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { entityId: q }, { actor: { fullName: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { actor: { select: { id: true, fullName: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("অডিট লগ", "Audit log")} desc={t("প্ল্যাটফর্মে কে কখন কী করেছে — সব রেকর্ড।", "Who did what, and when — every recorded action.")}><ExportLink entity="audit" query={{ entity, q }} /></CrmHeader>
      <SearchBox q={q} placeholder={t("অ্যাকশন, আইডি বা নাম", "Action, id or actor name")} hidden={{ entity }} />
      <FilterPills base="/admin/audit" param="entity" value={entity} sp={sp} options={[["", t("সব", "All")], ["User", "User"], ["TutorProfile", "Tutor"], ["KycDocument", "KYC"], ["TuitionPost", "Post"], ["TuitionApplication", "Application"], ["TuitionAgreement", "Agreement"], ["Invoice", "Invoice"], ["PlatformSetting", "Settings"], ["Broadcast", "Broadcast"]]} />
      <Table head={[t("সময়", "When"), t("কে", "Actor"), t("অ্যাকশন", "Action"), t("কিসের উপর", "Entity"), t("বিস্তারিত", "Details")]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-muted/40">
            <Td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, lang, { dateStyle: "medium", timeStyle: "short" })}</Td>
            <Td>{r.actor ? <A href={`/admin/users/${r.actor.id}`}>{r.actor.fullName}</A> : "System"}</Td>
            <Td className="font-mono text-xs">{r.action}</Td>
            <Td className="text-xs">{LINK[r.entity] ? <A href={LINK[r.entity] + r.entityId}>{r.entity}</A> : r.entity}<p className="font-mono text-[10px] text-muted-foreground">{r.entityId}</p></Td>
            <Td className="max-w-sm"><code className="line-clamp-3 break-all text-[11px] text-muted-foreground">{r.meta ? JSON.stringify(r.meta) : ""}</code></Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/audit" sp={sp} page={page} total={total} />
    </>
  );
}
