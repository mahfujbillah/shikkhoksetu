"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BadgeCheck, BarChart3, Bell, CalendarClock, ClipboardList, Download, FileSignature, FileText,
  GraduationCap, Receipt, Search, Settings, Star, Users, Wallet,
} from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

export function AdminNav({ isSuper, badges }: { isSuper: boolean; badges: { kyc: number; overdue: number } }) {
  const { t } = useT();
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // On phones the nav is a horizontal strip — keep the current section visible.
  useEffect(() => { navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" }); }, [path]);
  const groups: { label: string; items: { href: string; label: string; icon: React.ElementType; badge?: number }[] }[] = [
    { label: t("সারসংক্ষেপ", "Overview"), items: [
      { href: "/admin", label: t("ড্যাশবোর্ড", "Dashboard"), icon: BarChart3 },
      { href: "/admin/search", label: t("সব জায়গায় খুঁজুন", "Search everything"), icon: Search },
    ] },
    { label: t("মানুষ", "People"), items: [
      { href: "/admin/users", label: t("ব্যবহারকারী", "Users"), icon: Users },
      { href: "/admin/kyc", label: t("KYC যাচাই", "KYC review"), icon: BadgeCheck, badge: badges.kyc },
    ] },
    { label: t("মার্কেটপ্লেস", "Marketplace"), items: [
      { href: "/admin/tuitions", label: t("টিউশন পোস্ট", "Tuition posts"), icon: GraduationCap },
      { href: "/admin/applications", label: t("আবেদন", "Applications"), icon: ClipboardList },
      { href: "/admin/trials", label: t("ট্রায়াল ক্লাস", "Trial classes"), icon: CalendarClock },
      { href: "/admin/agreements", label: t("চুক্তি", "Agreements"), icon: FileSignature },
      { href: "/admin/sessions", label: t("ক্লাস লগ ও বেতন", "Sessions & salary"), icon: FileText },
    ] },
    { label: t("টাকা", "Money"), items: [
      { href: "/admin/invoices", label: t("ইনভয়েস", "Invoices"), icon: Receipt, badge: badges.overdue },
      { href: "/admin/payments", label: t("পেমেন্ট লেনদেন", "Payments"), icon: Wallet },
    ] },
    { label: t("যোগাযোগ", "Engagement"), items: [
      { href: "/admin/reviews", label: t("রিভিউ", "Reviews"), icon: Star },
      { href: "/admin/notifications", label: t("নোটিফিকেশন পাঠান", "Send notifications"), icon: Bell },
    ] },
    { label: t("সিস্টেম", "System"), items: [
      { href: "/admin/audit", label: t("অডিট লগ", "Audit log"), icon: Activity },
      { href: "/admin/export", label: t("ডেটা এক্সপোর্ট", "Export data"), icon: Download },
      ...(isSuper ? [{ href: "/admin/settings", label: t("সেটিংস", "Settings"), icon: Settings }] : []),
    ] },
  ];
  const active = (h: string) => (h === "/admin" ? path === "/admin" : path === h || path.startsWith(h + "/"));
  return (
    <nav ref={navRef} aria-label="Admin" className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
      {groups.map((g) => (
        <div key={g.label} className="flex shrink-0 gap-1 lg:flex-col">
          <p className="hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">{g.label}</p>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition", active(i.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <i.icon className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{i.label}</span>
              {!!i.badge && <span className={cn("ml-auto rounded-full px-1.5 text-[11px] font-bold", active(i.href) ? "bg-primary-foreground/20" : "bg-destructive text-white")}>{i.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
