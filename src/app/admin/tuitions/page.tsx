import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { gradeLabel, locationLabel } from "@/lib/catalog";
import { formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { adminCancelPostAction } from "@/server/actions/admin";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, SearchBox, Table, Td } from "@/components/admin/Crm";
import { ReopenPost } from "@/components/admin/CrmForms";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["OPEN", "SHORTLISTED", "CONFIRMED", "CANCELLED"] as const;

export default async function AdminTuitions({ searchParams }: PageProps<"/admin/tuitions">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const status = one(sp.status) as (typeof STATUSES)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const n = q && /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;
  const where: Prisma.TuitionPostWhereInput = {
    ...(status && STATUSES.includes(status) ? { status } : {}),
    ...(one(sp.noapps) ? { applicationsCount: 0 } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { guardian: { fullName: { contains: q, mode: "insensitive" } } }, ...(n ? [{ number: n }] : [])] } : {}),
  };
  const [posts, total] = await Promise.all([
    db.tuitionPost.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { guardian: { select: { id: true, fullName: true, phone: true } } } }),
    db.tuitionPost.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("টিউশন পোস্ট", "Tuition posts")}><ExportLink entity="tuitions" query={{ status, q }} /></CrmHeader>
      <SearchBox q={q} placeholder={t("শিরোনাম, অভিভাবক বা #নম্বর", "Title, guardian or #number")} hidden={{ status }} />
      <FilterPills base="/admin/tuitions" param="status" value={status} sp={sp} options={[["", t("সব", "All")], ...STATUSES.map((s) => [s, s] as [string, string])]} />
      <Table head={["#", t("শিরোনাম", "Title"), t("অভিভাবক", "Guardian"), t("বেতন", "Budget"), t("আবেদন", "Apps"), t("অবস্থা", "Status"), ""]} empty={posts.length === 0}>
        {posts.map((p) => (
          <tr key={p.id} className="hover:bg-muted/40">
            <Td className="font-mono">{formatNumber(p.number, lang)}</Td>
            <Td><A href={`/admin/tuitions/${p.id}`}>{p.title}</A><p className="text-xs text-muted-foreground">{gradeLabel(p.grade, lang)} · {locationLabel(p, lang)} · {timeAgo(p.createdAt, lang)}</p></Td>
            <Td><A href={`/admin/users/${p.guardian.id}`}>{p.guardian.fullName}</A><p className="text-xs text-muted-foreground">{p.guardian.phone ?? ""}</p></Td>
            <Td>{formatMoney(String(p.budgetMax), lang)}</Td>
            <Td>{p.applicationsCount} / {p.shortlistedCount}★</Td>
            <Td><StatusBadge status={p.status} lang={lang} /></Td>
            <Td>{(p.status === "OPEN" || p.status === "SHORTLISTED") ? <ActionButton action={adminCancelPostAction} fields={{ postId: p.id }} size="sm" variant="ghost" confirm="Cancel this post?">{t("বাতিল", "Cancel")}</ActionButton> : p.status === "CANCELLED" ? <ReopenPost postId={p.id} /> : null}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/tuitions" sp={sp} page={page} total={total} />
    </>
  );
}
