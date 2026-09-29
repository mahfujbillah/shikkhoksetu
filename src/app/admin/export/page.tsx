import { Download } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { CrmHeader } from "@/components/admin/Crm";
import { Card } from "@/components/ui/card";

export default async function AdminExport() {
  await requireAdmin();
  const { t } = await getT();
  const items: [string, string, string][] = [
    ["users", t("ব্যবহারকারী ও শিক্ষক", "Users & tutors"), t("নাম, ইমেইল, ফোন, ভূমিকা, যাচাই, ক্রেডিট", "Name, email, phone, role, verification, credits")],
    ["tuitions", t("টিউশন পোস্ট", "Tuition posts"), t("সব পোস্ট, ঠিকানা ও অভিভাবকের যোগাযোগসহ", "All posts incl. address and guardian contact")],
    ["applications", t("আবেদন", "Applications"), t("কোন শিক্ষক কোন টিউশনে আবেদন করেছেন", "Which tutor applied to which job")],
    ["agreements", t("চুক্তি", "Agreements"), t("বেতন, কমিশন, অবস্থা", "Salary, commission, status")],
    ["invoices", t("ইনভয়েস", "Invoices"), t("সব বিল ও পরিশোধের অবস্থা", "All bills and payment status")],
    ["payments", t("পেমেন্ট লেনদেন", "Payment transactions"), "SSLCommerz / Stripe / Manual"],
    ["audit", t("অডিট লগ", "Audit log"), t("সব অ্যাডমিন ও সিস্টেম কার্যক্রম", "Every admin and system action")],
  ];
  return (
    <>
      <CrmHeader title={t("ডেটা এক্সপোর্ট", "Export data")} desc={t("CSV ফাইল Excel বা Google Sheets-এ খোলা যায় (বাংলা ঠিকমতো দেখাবে)।", "CSV files open in Excel or Google Sheets (Bangla text is preserved).")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([k, l, d]) => (
          <a key={k} href={`/admin/export/${k}`}><Card className="flex h-full items-center gap-3 p-4 transition hover:border-primary"><Download className="size-5 shrink-0 text-primary" /><div><p className="font-semibold">{l}</p><p className="text-sm text-muted-foreground">{d}</p></div></Card></a>
        ))}
      </div>
    </>
  );
}
