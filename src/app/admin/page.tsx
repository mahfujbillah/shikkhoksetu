import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { adminOverview } from "@/server/services/admin";
import { crmDashboard } from "@/server/services/crm";
import { A, Bars, Section } from "@/components/admin/Crm";
import { Card } from "@/components/ui/card";

const ENTITY_HREF: Record<string, (id: string) => string> = {
  User: (id) => `/admin/users/${id}`,
  TuitionPost: (id) => `/admin/tuitions/${id}`,
  TuitionAgreement: (id) => `/admin/agreements/${id}`,
};

export default async function AdminHome() {
  await requireAdmin();
  const { t, lang } = await getT();
  const [o, d] = await Promise.all([adminOverview(), crmDashboard(30)]);
  const tiles: [string, string, string?][] = [
    [formatNumber(o.users, lang), t("মোট ব্যবহারকারী", "Users"), "/admin/users"],
    [formatNumber(o.tutors, lang), t("শিক্ষক প্রোফাইল", "Tutor profiles"), "/admin/users?role=TUTOR"],
    [formatNumber(o.verified, lang), t("যাচাইকৃত শিক্ষক", "Verified tutors"), "/admin/kyc?tab=VERIFIED"],
    [formatNumber(o.pendingKyc, lang), t("KYC অপেক্ষমাণ", "KYC awaiting review"), "/admin/kyc"],
    [formatNumber(o.openPosts, lang), t("খোলা টিউশন", "Open tuitions"), "/admin/tuitions?status=OPEN"],
    [formatNumber(o.activeAgreements, lang), t("চলমান চুক্তি", "Active agreements"), "/admin/agreements?status=ACTIVE"],
    [formatNumber(o.unpaid, lang), t("বকেয়া ইনভয়েস", "Unpaid invoices"), "/admin/invoices?status=ISSUED"],
    [formatMoney(o.revenue, lang), t("মোট আয় (পরিশোধিত)", "Revenue collected"), "/admin/payments"],
  ];
  const a = d.attention;
  const alerts: [number, string, string][] = ([
    [a.pendingKyc, t("জন শিক্ষকের KYC যাচাই বাকি", "tutors waiting for KYC review"), "/admin/kyc"],
    [a.overdue, t("টি ইনভয়েস মেয়াদোত্তীর্ণ", "invoices overdue"), "/admin/invoices?status=OVERDUE"],
    [a.awaitingSign, t("টি চুক্তিতে শিক্ষকের স্বাক্ষর বাকি", "agreements awaiting the tutor's signature"), "/admin/agreements?status=PENDING_SIGNATURES"],
    [a.staleJobs, t("টি টিউশনে ৩ দিনেও কোনো আবেদন আসেনি", "open jobs with no applicants after 3 days"), "/admin/tuitions?status=OPEN&noapps=1"],
    [a.blocked, t("জন ব্যবহারকারী ব্লকড", "users blocked"), "/admin/users?blocked=1"],
  ] as [number, string, string][]).filter(([n]) => n > 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([v, l, h]) => (
          <Link key={l} href={h!}><Card className="h-full p-4 transition hover:border-primary hover:shadow-md"><p className="font-display text-2xl font-bold text-primary sm:text-3xl">{v}</p><p className="mt-1 text-sm text-muted-foreground">{l}</p></Card></Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Bars label={t("নতুন ব্যবহারকারী (৩০ দিন)", "New users (30 days)")} data={d.series.map((s) => ({ day: s.day, v: s.users }))} format={(n) => formatNumber(n, lang)} />
        <Bars label={t("নতুন টিউশন পোস্ট (৩০ দিন)", "New tuition posts (30 days)")} data={d.series.map((s) => ({ day: s.day, v: s.posts }))} format={(n) => formatNumber(n, lang)} />
        <Bars label={t("আয় (৩০ দিন)", "Revenue (30 days)")} data={d.series.map((s) => ({ day: s.day, v: s.revenue }))} format={(n) => formatMoney(n, lang)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t("মনোযোগ দরকার", "Needs attention")}>
          {alerts.length === 0 ? <p className="text-sm text-muted-foreground">{t("সব ঠিক আছে 👍", "All clear 👍")}</p> : (
            <ul className="space-y-2">
              {alerts.map(([n, l, h]) => (
                <li key={h}><Link href={h} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:border-primary"><AlertTriangle className="size-4 text-accent-foreground" /><b>{formatNumber(n, lang)}</b> {l}</Link></li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={t("সাম্প্রতিক কার্যক্রম", "Recent activity")} action={<A href="/admin/audit">{t("সব দেখুন", "View all")}</A>}>
          {d.recent.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
            <ul className="divide-y divide-border text-sm">
              {d.recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0"><b>{r.actor?.fullName ?? "System"}</b> · <span className="font-mono text-xs">{r.action}</span> · {ENTITY_HREF[r.entity] ? <A href={ENTITY_HREF[r.entity](r.entityId)}>{r.entity}</A> : r.entity}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(r.createdAt, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
