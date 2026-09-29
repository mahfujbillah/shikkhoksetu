import Link from "next/link";
import { formatMoney, formatNumber } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { adminOverview } from "@/server/services/admin";
import { Card } from "@/components/ui/card";

export default async function AdminHome() {
  await requireAdmin();
  const { t, lang } = await getT();
  const o = await adminOverview();
  const tiles: [string, string, string?][] = [
    [formatNumber(o.users, lang), t("মোট ব্যবহারকারী", "Users"), "/admin/users"],
    [formatNumber(o.tutors, lang), t("শিক্ষক প্রোফাইল", "Tutor profiles")],
    [formatNumber(o.verified, lang), t("যাচাইকৃত শিক্ষক", "Verified tutors")],
    [formatNumber(o.pendingKyc, lang), t("KYC অপেক্ষমাণ", "KYC awaiting review"), "/admin/kyc"],
    [formatNumber(o.openPosts, lang), t("খোলা টিউশন", "Open tuitions"), "/admin/tuitions"],
    [formatNumber(o.activeAgreements, lang), t("চলমান চুক্তি", "Active agreements")],
    [formatNumber(o.unpaid, lang), t("বকেয়া ইনভয়েস", "Unpaid invoices"), "/admin/invoices"],
    [formatMoney(o.revenue, lang), t("মোট আয় (পরিশোধিত)", "Revenue collected")],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(([v, l, h]) => {
        const inner = <Card className="h-full p-5 transition hover:shadow-md"><p className="font-display text-3xl font-bold text-primary">{v}</p><p className="mt-1 text-sm text-muted-foreground">{l}</p></Card>;
        return h ? <Link key={l} href={h}>{inner}</Link> : <div key={l}>{inner}</div>;
      })}
    </div>
  );
}
