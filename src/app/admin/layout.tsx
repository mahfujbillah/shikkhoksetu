import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Search } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { getSessionUser } from "@/server/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN" || user.isBlocked) redirect("/dashboard");
  const { t } = await getT();
  const [kyc, overdue] = await Promise.all([
    db.tutorProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.invoice.count({ where: { status: "OVERDUE" } }),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          Admin CRM {user.isSuperAdmin && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"><Crown className="size-4" /> Super admin</span>}
        </Link>
        <form action="/admin/search" className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" placeholder={t("নাম, ইমেইল, ফোন, #টিউশন, INV-…", "Name, email, phone, #job, INV-…")} className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary" />
        </form>
      </div>
      <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-6">
        <aside className="mb-4 lg:mb-0"><div className="lg:sticky lg:top-20"><AdminNav isSuper={user.isSuperAdmin} badges={{ kyc, overdue }} /></div></aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
