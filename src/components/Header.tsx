"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { isConfigured } from "@/lib/supabase";

export function Header() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const account = !isConfigured ? null : user
    ? { href: "/dashboard", label: t.dash.nav }
    : { href: "/login", label: t.nav.login };

  const links = [
    { href: "/tuitions", label: t.nav.tuitions },
    { href: "/tutors", label: t.nav.tutors },
    { href: "/#how", label: t.nav.how },
  ];

  const LangToggle = (
    <div className="flex rounded-full border border-border p-0.5 text-xs font-semibold">
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          aria-pressed={lang === l}
        >
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">{t.brand}</span>
        </Link>

        <nav className="hidden items-center gap-5 whitespace-nowrap text-sm lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`transition hover:text-primary ${pathname === l.href ? "font-semibold text-primary" : "text-muted-foreground"}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
          {LangToggle}
          {account ? (
            <>
              <Link href={account.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">{account.label}</Link>
              {profile?.role === "admin" && <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">Admin</Link>}
              {user && <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">{t.auth.logout}</button>}
            </>
          ) : (
            <Link href="/become-tutor" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {t.nav.become}
            </Link>
          )}
          <Link href="/post-tuition" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:brightness-95">
            {t.nav.post}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {LangToggle}
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-muted" aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 lg:hidden">
          {[...links, { href: "/become-tutor", label: t.nav.become }, ...(account ? [account] : []), ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
              {l.label}
            </Link>
          ))}
          <Link href="/post-tuition" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground">
            {t.nav.post}
          </Link>
          {user && <button onClick={() => { signOut(); setOpen(false); }} className="mt-2 block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">{t.auth.logout}</button>}
        </div>
      )}
    </header>
  );
}
