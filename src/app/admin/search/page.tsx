import { formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { globalSearch } from "@/server/services/crm";
import { A, CrmHeader, one, Section } from "@/components/admin/Crm";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

export default async function AdminSearch({ searchParams }: PageProps<"/admin/search">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const q = one((await searchParams).q) ?? "";
  const r = await globalSearch(q);
  const total = r ? r.users.length + r.posts.length + r.agreements.length + r.invoices.length + r.transactions.length : 0;
  return (
    <>
      <CrmHeader title={t("সব জায়গায় খুঁজুন", "Search everything")} desc={q ? t(`"${q}" — ${total}টি ফলাফল`, `"${q}" — ${total} results`) : t("উপরের সার্চ বক্সে নাম, ইমেইল, ফোন, #টিউশন নম্বর, চুক্তি নম্বর বা INV-… লিখুন।", "Type a name, email, phone, #job number, agreement number or INV-… in the search box above.")} />
      {r && (
        <div className="space-y-4">
          {r.users.length > 0 && <Section title={t("ব্যবহারকারী", "Users")}><ul className="space-y-1.5 text-sm">{r.users.map((u) => <li key={u.id} className="flex flex-wrap items-center gap-2"><A href={`/admin/users/${u.id}`}>{u.fullName}</A><Badge variant="secondary">{u.role}</Badge>{u.tutorProfile && <StatusBadge status={u.tutorProfile.verificationStatus} lang={lang} />}<span className="text-muted-foreground">{u.email} · {u.phone ?? "—"}</span></li>)}</ul></Section>}
          {r.posts.length > 0 && <Section title={t("টিউশন পোস্ট", "Tuition posts")}><ul className="space-y-1.5 text-sm">{r.posts.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-2"><StatusBadge status={p.status} lang={lang} /><A href={`/admin/tuitions/${p.id}`}>#{formatNumber(p.number, lang)} {p.title}</A><span className="text-muted-foreground">{p.guardian.fullName}</span></li>)}</ul></Section>}
          {r.agreements.length > 0 && <Section title={t("চুক্তি", "Agreements")}><ul className="space-y-1.5 text-sm">{r.agreements.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/agreements/${a.id}`}>#{a.agreementNumber}</A><span className="text-muted-foreground">{a.guardian.fullName} ↔ {a.tutorProfile.user.fullName} · {formatMoney(String(a.monthlySalary), lang)}</span></li>)}</ul></Section>}
          {r.invoices.length > 0 && <Section title={t("ইনভয়েস", "Invoices")}><ul className="space-y-1.5 text-sm">{r.invoices.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2"><StatusBadge status={i.status} lang={lang} /><A href={`/admin/invoices?q=${i.invoiceNumber}`}>{i.invoiceNumber}</A><span className="text-muted-foreground">{i.billedTo.fullName} · {formatMoney(String(i.amount), lang)}</span></li>)}</ul></Section>}
          {r.transactions.length > 0 && <Section title={t("লেনদেন", "Transactions")}><ul className="space-y-1.5 text-sm">{r.transactions.map((x) => <li key={x.id} className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{x.status}</Badge><A href={`/admin/payments?q=${x.tranId}`}>{x.tranId}</A><span className="text-muted-foreground">{x.provider} · {formatMoney(String(x.amount), lang)}</span></li>)}</ul></Section>}
          {total === 0 && <p className="text-muted-foreground">{t("কিছু পাওয়া যায়নি।", "Nothing found.")}</p>}
        </div>
      )}
    </>
  );
}
