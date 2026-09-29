import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { getSessionUser } from "@/server/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const { t } = await getT();
  const nav = [["/admin", t("সারসংক্ষেপ", "Overview")], ["/admin/kyc", t("KYC যাচাই", "KYC review")], ["/admin/users", t("ব্যবহারকারী", "Users")], ["/admin/tuitions", t("টিউশন", "Tuitions")], ["/admin/invoices", t("ইনভয়েস", "Invoices")], ...(user.isSuperAdmin ? [["/admin/settings", t("সেটিংস", "Settings")]] : [])];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold">Admin {user.isSuperAdmin && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"><Crown className="size-4" /> Super admin</span>}</h1>
        <nav className="flex gap-1 overflow-x-auto rounded-full border border-border bg-card p-1">{nav.map(([h, l]) => <Link key={h} href={h} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{l}</Link>)}</nav>
      </div>
      {children}
    </div>
  );
}
