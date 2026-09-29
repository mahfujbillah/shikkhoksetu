import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, SearchBox, Table, Td } from "@/components/admin/Crm";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = ["SSLCOMMERZ", "STRIPE", "MANUAL"] as const;

export default async function AdminPayments({ searchParams }: PageProps<"/admin/payments">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const provider = one(sp.provider) as (typeof PROVIDERS)[number] | undefined;
  const { page, skip, take } = paging(sp);
  const where: Prisma.PaymentTransactionWhereInput = {
    ...(provider && PROVIDERS.includes(provider) ? { provider } : {}),
    ...(q ? { OR: [{ tranId: { contains: q, mode: "insensitive" } }, { providerRef: { contains: q, mode: "insensitive" } }, { invoice: { invoiceNumber: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total, collected] = await Promise.all([
    db.paymentTransaction.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { invoice: { select: { invoiceNumber: true, billedTo: { select: { id: true, fullName: true } } } } } }),
    db.paymentTransaction.count({ where }),
    db.paymentTransaction.groupBy({ by: ["provider"], where: { status: "SUCCESS" }, _sum: { amount: true } }),
  ]);
  return (
    <>
      <CrmHeader title={t("পেমেন্ট লেনদেন", "Payment transactions")} desc={t("গেটওয়ে (SSLCommerz/Stripe) ও ম্যানুয়াল — সব লেনদেন।", "Every gateway (SSLCommerz / Stripe) and manual transaction.")}><ExportLink entity="payments" query={{ provider, q }} /></CrmHeader>
      <div className="mb-3 flex flex-wrap gap-2">{PROVIDERS.map((p) => <div key={p} className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><span className="text-muted-foreground">{p}</span> <b>{formatMoney(String(collected.find((c) => c.provider === p)?._sum.amount ?? 0), lang)}</b></div>)}</div>
      <SearchBox q={q} placeholder={t("tran_id, রেফারেন্স বা INV", "tran_id, reference or INV")} hidden={{ provider }} />
      <FilterPills base="/admin/payments" param="provider" value={provider} sp={sp} options={[["", t("সব", "All")], ...PROVIDERS.map((p) => [p, p] as [string, string])]} />
      <Table head={[t("সময়", "When"), "tran_id", t("ইনভয়েস", "Invoice"), t("গেটওয়ে", "Provider"), t("পরিমাণ", "Amount"), t("অবস্থা", "Status")]} empty={rows.length === 0}>
        {rows.map((x) => (
          <tr key={x.id} className="hover:bg-muted/40">
            <Td className="whitespace-nowrap">{formatDate(x.createdAt, lang, { dateStyle: "medium", timeStyle: "short" })}</Td>
            <Td className="font-mono text-xs">{x.tranId}{x.providerRef && <p className="text-muted-foreground">{x.providerRef}</p>}</Td>
            <Td><A href={`/admin/invoices?q=${x.invoice.invoiceNumber}`}>{x.invoice.invoiceNumber}</A><p className="text-xs"><A href={`/admin/users/${x.invoice.billedTo.id}`}>{x.invoice.billedTo.fullName}</A></p></Td>
            <Td>{x.provider}</Td>
            <Td>{formatMoney(String(x.amount), lang)} <span className="text-xs text-muted-foreground">{x.currency}</span></Td>
            <Td><Badge variant={x.status === "SUCCESS" ? "success" : x.status === "FAILED" ? "destructive" : "secondary"}>{x.status}</Badge>{x.failureReason && <p className="text-xs text-destructive">{x.failureReason}</p>}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/payments" sp={sp} page={page} total={total} />
    </>
  );
}
