import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { manualPaymentAction, voidInvoiceAction } from "@/server/actions/admin";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, SearchBox, Table, Td } from "@/components/admin/Crm";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = ["ISSUED", "OVERDUE", "PAID", "VOID"] as const;

export default async function AdminInvoices({ searchParams }: PageProps<"/admin/invoices">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const status = one(sp.status) as (typeof STATUSES)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const where: Prisma.InvoiceWhereInput = {
    ...(status && STATUSES.includes(status) ? { status } : {}),
    ...(q ? { OR: [{ invoiceNumber: { contains: q, mode: "insensitive" } }, { billedTo: { fullName: { contains: q, mode: "insensitive" } } }, { billedTo: { email: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [invoices, total, sums] = await Promise.all([
    db.invoice.findMany({ where, orderBy: { issuedAt: "desc" }, skip, take, include: { billedTo: { select: { id: true, fullName: true, email: true } }, agreement: { select: { id: true, agreementNumber: true } }, transactions: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    db.invoice.count({ where }),
    db.invoice.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
  ]);
  const sum = (s: string) => sums.find((x) => x.status === s);
  return (
    <>
      <CrmHeader title={t("ইনভয়েস", "Invoices")}><ExportLink entity="invoices" query={{ status, q }} /></CrmHeader>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUSES.map((s) => <div key={s} className="rounded-xl border border-border bg-card p-3"><StatusBadge status={s} lang={lang} /><p className="mt-1 font-display text-lg font-bold">{formatMoney(String(sum(s)?._sum.amount ?? 0), lang)}</p><p className="text-xs text-muted-foreground">{sum(s)?._count ?? 0} {t("টি", "invoices")}</p></div>)}
      </div>
      <SearchBox q={q} placeholder={t("INV নম্বর, নাম বা ইমেইল", "INV number, name or email")} hidden={{ status }} />
      <FilterPills base="/admin/invoices" param="status" value={status} sp={sp} options={[["", t("সব", "All")], ...STATUSES.map((s) => [s, s] as [string, string])]} />
      <Table head={[t("নম্বর", "Number"), t("ধরন", "Type"), t("কার কাছে", "Billed to"), t("পরিমাণ", "Amount"), t("শেষ তারিখ", "Due"), t("অবস্থা", "Status"), ""]} empty={invoices.length === 0}>
        {invoices.map((i) => (
          <tr key={i.id} className="hover:bg-muted/40">
            <Td className="font-mono text-xs">{i.invoiceNumber}{i.agreement && <><br /><A href={`/admin/agreements/${i.agreement.id}`}>#{i.agreement.agreementNumber}</A></>}</Td>
            <Td className="text-xs">{i.type.replaceAll("_", " ")}</Td>
            <Td><A href={`/admin/users/${i.billedTo.id}`}>{i.billedTo.fullName}</A><p className="text-xs text-muted-foreground">{i.billedTo.email}</p></Td>
            <Td>{formatMoney(String(i.amount), lang)}</Td>
            <Td className="whitespace-nowrap">{formatDate(i.dueDate, lang)}{i.paidAt && <p className="text-xs text-success">{t("পরিশোধ", "paid")} {formatDate(i.paidAt, lang)}</p>}</Td>
            <Td><StatusBadge status={i.status} lang={lang} />{i.transactions[0] && <p className="text-[11px] text-muted-foreground">{i.transactions[0].provider} {i.transactions[0].status}</p>}</Td>
            <Td>{(i.status === "ISSUED" || i.status === "OVERDUE") && <div className="flex flex-wrap gap-1"><ActionButton action={manualPaymentAction} fields={{ invoiceId: i.id, reference: "manual/cash" }} size="sm" confirm="Record this invoice as paid offline?">{t("পরিশোধিত", "Mark paid")}</ActionButton><ActionButton action={voidInvoiceAction} fields={{ invoiceId: i.id, reason: "Waived by admin" }} size="sm" variant="ghost" confirm="Void this invoice?">{t("মওকুফ", "Void")}</ActionButton></div>}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/invoices" sp={sp} page={page} total={total} />
    </>
  );
}
