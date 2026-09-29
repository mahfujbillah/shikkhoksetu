import Link from "next/link";
import { Suspense } from "react";
import { Bell, GraduationCap, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { getSessionUser } from "@/server/auth";
import { buttonVariants } from "@/components/ui/button";
import { LangToggle } from "./LanguageProvider";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const [{ t }, user] = await Promise.all([getT(), getSessionUser().catch(() => null)]);
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }).catch(() => 0) : 0;

  const links = [
    { href: "/tuitions", label: t("টিউশন জব বোর্ড", "Tuition jobs") },
    { href: "/tutors", label: t("শিক্ষক খুঁজুন", "Find tutors") },
    { href: "/#how", label: t("কীভাবে কাজ করে", "How it works") },
  ];
  const cta = user?.role === "TUTOR" ? { href: "/tuitions", label: t("জব খুঁজুন", "Browse jobs") } : { href: "/post-tuition", label: t("টিউশন পোস্ট করুন", "Post a tuition") };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="size-5" /></span>
          <span className="font-display text-lg font-bold tracking-tight">{t("শিক্ষকসেতু", "ShikkhokSetu")}</span>
        </Link>

        <nav className="hidden items-center gap-6 whitespace-nowrap text-sm text-muted-foreground lg:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className="hover:text-primary">{l.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-2 whitespace-nowrap lg:flex">
          <Suspense><LangToggle /></Suspense>
          {user ? (
            <>
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <LayoutDashboard /> {t("ড্যাশবোর্ড", "Dashboard")}
                {unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">{unread}</span>}
              </Link>
              {user.role === "ADMIN" && <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}><Shield /> Admin</Link>}
              <form action="/auth/signout" method="post"><button className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={t("লগআউট", "Log out")}><LogOut /></button></form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>{t("লগইন", "Log in")}</Link>
          )}
          <Link href={cta.href} className={buttonVariants({ variant: "accent", size: "sm" })}>{cta.label}</Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Suspense><LangToggle /></Suspense>
          {user && <Link href="/dashboard" className="relative p-2" aria-label="Dashboard"><Bell className="size-5" />{unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" />}</Link>}
          <MobileNav links={[...links, ...(user ? [{ href: "/dashboard", label: t("ড্যাশবোর্ড", "Dashboard") }] : [{ href: "/login", label: t("লগইন", "Log in") }]), ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []), cta]} signedIn={!!user} logoutLabel={t("লগআউট", "Log out")} />
        </div>
      </div>
    </header>
  );
}
