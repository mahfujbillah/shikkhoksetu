import { CreditCard, Globe } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { CREDIT_PACKS, listMyInvoices, markOverdueInvoices } from "@/server/services/billing";
import { getSettings } from "@/server/services/common";
import { sslcommerzEnabled } from "@/server/payments/sslcommerz";
import { stripeEnabled } from "@/server/payments/stripe";
import { buyCreditsAction, payInvoiceAction } from "@/server/actions/account";
import { ActionButton } from "@/components/FormBits";
import { Empty, PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";

export default async function InvoicesPage({ searchParams }: PageProps<"/dashboard/invoices">) {
  const [user, { t, lang }, sp] = await Promise.all([requireUser(), getT(), searchParams]);
  await markOverdueInvoices();
  const [invoices, settings] = await Promise.all([listMyInvoices(user.id), getSettings()]);
  const ssl = sslcommerzEnabled(), stripe = stripeEnabled();
  return (
    <>
      <PageHeader title={t("ইনভয়েস ও পেমেন্ট", "Invoices & payments")} desc={t("bKash, Nagad, Rocket ও কার্ড — SSLCommerz-এর মাধ্যমে নিরাপদ পেমেন্ট।", "bKash, Nagad, Rocket and cards — secured by SSLCommerz.")} />
      {sp.paid && <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("পেমেন্ট সফল হয়েছে, ধন্যবাদ!", "Payment successful — thank you!")}</p>}
      {sp.failed && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{t("পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।", "The payment did not go through. Please try again.")}</p>}
      {invoices.length === 0 ? <Empty>{t("কোনো ইনভয়েস নেই।", "No invoices.")}</Empty> : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const items = (inv.lineItems as { label: string; amount: number }[]) ?? [];
            const due = inv.status === "ISSUED" || inv.status === "OVERDUE";
            return (
              <Card key={inv.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><StatusBadge status={inv.status} lang={lang} /><span className="font-mono text-sm">{inv.invoiceNumber}</span></div>
                    {items.map((li, i) => <p key={i} className="mt-1 text-sm">{li.label}</p>)}
                    <p className="text-xs text-muted-foreground">{t("ইস্যু", "Issued")} {formatDate(inv.issuedAt, lang)} · {inv.paidAt ? `${t("পরিশোধ", "Paid")} ${formatDate(inv.paidAt, lang)}` : `${t("শেষ তারিখ", "Due")} ${formatDate(inv.dueDate, lang)}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">{formatMoney(String(inv.amount), lang)}</p>
                    {due && (
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        {ssl && <ActionButton action={payInvoiceAction} fields={{ invoiceId: inv.id, provider: "SSLCOMMERZ" }} size="sm"><CreditCard /> bKash / Nagad / {t("কার্ড", "Card")}</ActionButton>}
                        {stripe && <ActionButton action={payInvoiceAction} fields={{ invoiceId: inv.id, provider: "STRIPE" }} size="sm" variant="outline"><Globe /> {t("আন্তর্জাতিক কার্ড", "International card")}</ActionButton>}
                        {!ssl && !stripe && <p className="max-w-60 text-xs text-muted-foreground">{t("অনলাইন পেমেন্ট শীঘ্রই চালু হবে। আপাতত অ্যাডমিনের সাথে যোগাযোগ করে পরিশোধ করুন।", "Online payment is coming soon — please contact the admin to pay for now.")}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {user.role === "TUTOR" && settings.monetizationMode !== "COMMISSION" && (
        <Card className="mt-8 p-6">
          <h2 className="font-bold">{t("আবেদন ক্রেডিট কিনুন", "Buy application credits")}</h2>
          <p className="text-sm text-muted-foreground">{t(`প্রতি আবেদনে ${formatNumber(settings.applyCreditCost, lang)} ক্রেডিট লাগে।`, `Each application costs ${settings.applyCreditCost} credit(s).`)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((p, i) => (
              <div key={i} className="rounded-xl border border-border p-4 text-center">
                <p className="font-display text-2xl font-bold">{formatNumber(p.credits, lang)}</p><p className="text-sm text-muted-foreground">{t("ক্রেডিট", "credits")} · {formatMoney(p.price, lang)}</p>
                <div className="mt-3"><ActionButton action={buyCreditsAction} fields={{ pack: String(i) }} size="sm">{t("কিনুন", "Buy")}</ActionButton></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
