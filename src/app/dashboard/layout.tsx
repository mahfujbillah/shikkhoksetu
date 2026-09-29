import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, BookOpenCheck, Briefcase, FileText, Home, IdCard, Receipt, UserRound } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { getSessionUser } from "@/server/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  const { t } = await getT();
  const tutor = user.role === "TUTOR";
  const nav = [
    { href: "/dashboard", icon: Home, label: t("সারসংক্ষেপ", "Overview") },
    ...(tutor
      ? [
          { href: "/dashboard/applications", icon: Briefcase, label: t("আমার আবেদন", "My applications") },
          { href: "/dashboard/profile", icon: UserRound, label: t("প্রোফাইল", "Profile") },
          { href: "/dashboard/kyc", icon: IdCard, label: t("KYC যাচাই", "KYC verification") },
        ]
      : [
          { href: "/dashboard/jobs", icon: Briefcase, label: t("আমার টিউশন পোস্ট", "My tuition posts") },
          { href: "/dashboard/profile", icon: UserRound, label: t("যোগাযোগের তথ্য", "Contact details") },
        ]),
    { href: "/dashboard/tuitions", icon: BookOpenCheck, label: t("চলমান টিউশন", "Active tuitions") },
    { href: "/dashboard/invoices", icon: Receipt, label: t("ইনভয়েস", "Invoices") },
  ];
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[230px_1fr]">
      <aside className="no-print">
        <div className="rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-24">
          <div className="px-3 py-2">
            <p className="truncate font-semibold">{user.fullName}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">{tutor ? <><BadgeCheck className="size-3" /> {t("শিক্ষক", "Tutor")}</> : user.role === "ADMIN" ? "Admin" : <><FileText className="size-3" /> {t("অভিভাবক / শিক্ষার্থী", "Guardian / Student")}</>}</p>
          </div>
          <nav className="mt-1 flex gap-1 overflow-x-auto lg:flex-col">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <n.icon className="size-4" /> {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
