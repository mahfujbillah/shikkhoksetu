import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { manualPaymentAction, voidInvoiceAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/FormBits";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";

export default async function AdminInvoices() {
  await requireAdmin();
  const { t, lang } = await getT();
  const invoices = await db.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: 100, include: { billedTo: { select: { fullName: true, email: true } }, transactions: { orderBy: { createdAt: "desc" }, take: 1 } } });
  return (
    <Card className="divide-y divide-border">
      {invoices.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-semibold"><StatusBadge status={i.status} lang={lang} /> <span className="font-mono">{i.invoiceNumber}</span> · {i.type.replaceAll("_", " ")} · {formatMoney(String(i.amount), lang)}</p>
            <p className="text-muted-foreground">{i.billedTo.fullName} · {i.billedTo.email} · {t("শেষ তারিখ", "due")} {formatDate(i.dueDate, lang)}{i.transactions[0] ? ` · last txn ${i.transactions[0].provider} ${i.transactions[0].status}` : ""}</p>
          </div>
          {(i.status === "ISSUED" || i.status === "OVERDUE") && (
            <div className="flex gap-2">
              <ActionButton action={manualPaymentAction} fields={{ invoiceId: i.id, reference: "manual/cash" }} size="sm" confirm="Record this invoice as paid offline?">{t("পরিশোধিত (ম্যানুয়াল)", "Mark paid (manual)")}</ActionButton>
              <ActionButton action={voidInvoiceAction} fields={{ invoiceId: i.id, reason: "Waived by admin" }} size="sm" variant="ghost" confirm="Void this invoice?">{t("মওকুফ", "Void")}</ActionButton>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
