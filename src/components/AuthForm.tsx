"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Info, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useT } from "./LanguageProvider";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";
type Role = "guardian" | "tutor";

const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

/**
 * Supabase email/password form, used by the /login and /signup pages and by <AuthModal>.
 * The DB trigger creates the marketplace `users` row on sign-up.
 *  - `onSwitch`: when given, the login/sign-up toggle switches in place (modal) instead of navigating.
 *  - `onDone`: when given, called after a successful login instead of redirecting (modal stays on the page).
 */
export function AuthPanel({ mode, next, defaultRole = "guardian", onSwitch, onDone }: { mode: Mode; next: string; defaultRole?: Role; onSwitch?: (m: Mode) => void; onDone?: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaultRole);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (onDone) { onDone(); router.refresh(); } else { router.replace(next); router.refresh(); }
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { role, full_name: String(fd.get("full_name")).trim() }, emailRedirectTo: `${window.location.origin}/login` } });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (data.session) {
        // New tutors must build a profile and pass KYC before they can apply, so send them there.
        router.replace(role === "tutor" ? `/dashboard/profile?welcome=1&next=${encodeURIComponent(next)}` : onDone ? next : "/post-tuition");
        router.refresh();
        onDone?.();
      } else setMsg({ ok: true, text: t("ইমেইলে পাঠানো লিংকে ক্লিক করে অ্যাকাউন্ট নিশ্চিত করুন, তারপর লগইন করুন।", "Confirm your account from the link we emailed, then log in.") });
    }
  }

  const other: Mode = mode === "login" ? "signup" : "login";
  const switchLink = (label: string) =>
    onSwitch
      ? <button type="button" onClick={() => { setMsg(null); onSwitch(other); }} className="font-semibold text-primary">{label}</button>
      : <Link href={`/${other}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary">{label}</Link>;

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <>
          <div>
            <Label>{t("আমি একজন", "I am a")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["guardian", "tutor"] as const).map((r) => (
                <button type="button" key={r} onClick={() => setRole(r)} aria-pressed={role === r} className={cn("rounded-xl border py-2.5 text-sm font-semibold transition", role === r ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                  {r === "guardian" ? t("অভিভাবক / শিক্ষার্থী", "Guardian / Student") : t("শিক্ষক", "Tutor")}
                </button>
              ))}
            </div>
          </div>
          <div><Label htmlFor={`full_name-${mode}`}>{t("পূর্ণ নাম", "Full name")}</Label><Input id={`full_name-${mode}`} name="full_name" required minLength={3} autoComplete="name" /></div>
        </>
      )}
      <div><Label htmlFor={`email-${mode}`}>{t("ইমেইল", "Email")}</Label><Input id={`email-${mode}`} name="email" type="email" required autoComplete="email" /></div>
      <div><Label htmlFor={`password-${mode}`}>{t("পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)", "Password (min 8 characters)")}</Label><Input id={`password-${mode}`} name="password" type="password" required minLength={mode === "signup" ? 8 : 6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
      {msg && <p className={cn("flex gap-2 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}><Info className="mt-0.5 size-4 shrink-0" /> {msg.text}</p>}
      <Button disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" />}{mode === "login" ? t("লগইন", "Log in") : t("অ্যাকাউন্ট খুলুন", "Sign up")}</Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? <>{t("অ্যাকাউন্ট নেই?", "No account?")} {switchLink(t("খুলুন", "Sign up"))}</> : <>{t("আগেই অ্যাকাউন্ট আছে?", "Already registered?")} {switchLink(t("লগইন", "Log in"))}</>}
      </p>
    </form>
  );
}

/** Full-page form for /login and /signup. */
export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useT();
  const sp = useSearchParams();
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="flex justify-center"><span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><GraduationCap className="size-6" /></span></div>
      <h1 className="mt-4 text-center font-display text-3xl font-bold">{mode === "login" ? t("লগইন করুন", "Log in") : t("অ্যাকাউন্ট খুলুন", "Create your account")}</h1>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <AuthPanel mode={mode} next={safeNext(sp.get("next"))} defaultRole={sp.get("role") === "tutor" ? "tutor" : "guardian"} />
      </div>
    </div>
  );
}

/** Login / sign-up in a dialog, so a visitor can apply without leaving the job board. */
export function AuthModal({ open, onOpenChange, next, reason }: { open: boolean; onOpenChange: (o: boolean) => void; next: string; reason?: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>("login");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? t("লগইন করুন", "Log in to continue") : t("শিক্ষক হিসেবে অ্যাকাউন্ট খুলুন", "Create your account")}</DialogTitle>
          <DialogDescription>{reason ?? t("আবেদন করতে আপনার শিক্ষক অ্যাকাউন্টে লগইন করুন।", "Log in to your tutor account to apply.")}</DialogDescription>
        </DialogHeader>
        <AuthPanel key={mode} mode={mode} next={safeNext(next)} defaultRole="tutor" onSwitch={setMode} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
