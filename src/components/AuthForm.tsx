"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Info, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useT } from "./LanguageProvider";
import { cn } from "@/lib/utils";

/** Supabase email/password auth. The DB trigger creates the marketplace `users` row on sign-up. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [role, setRole] = useState<"guardian" | "tutor">(sp.get("role") === "tutor" ? "tutor" : "guardian");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const next = (() => { const n = sp.get("next"); return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard"; })();

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
      router.replace(next); router.refresh();
    } else {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { role, full_name: String(fd.get("full_name")).trim() }, emailRedirectTo: `${window.location.origin}/login` } });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (data.session) { router.replace(role === "tutor" ? "/dashboard/profile?welcome=1" : "/post-tuition"); router.refresh(); }
      else setMsg({ ok: true, text: t("ইমেইলে পাঠানো লিংকে ক্লিক করে অ্যাকাউন্ট নিশ্চিত করুন, তারপর লগইন করুন।", "Confirm your account from the link we emailed, then log in.") });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="flex justify-center"><span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><GraduationCap className="size-6" /></span></div>
      <h1 className="mt-4 text-center font-display text-3xl font-bold">{mode === "login" ? t("লগইন করুন", "Log in") : t("অ্যাকাউন্ট খুলুন", "Create your account")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
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
            <div><Label htmlFor="full_name">{t("পূর্ণ নাম", "Full name")}</Label><Input id="full_name" name="full_name" required minLength={3} autoComplete="name" /></div>
          </>
        )}
        <div><Label htmlFor="email">{t("ইমেইল", "Email")}</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div><Label htmlFor="password">{t("পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)", "Password (min 8 characters)")}</Label><Input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : 6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
        {msg && <p className={cn("flex gap-2 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}><Info className="mt-0.5 size-4 shrink-0" /> {msg.text}</p>}
        <Button disabled={busy} className="w-full">{busy && <Loader2 className="animate-spin" />}{mode === "login" ? t("লগইন", "Log in") : t("অ্যাকাউন্ট খুলুন", "Sign up")}</Button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? <>{t("অ্যাকাউন্ট নেই?", "No account?")} <Link href={`/signup${next !== "/dashboard" ? `?next=${next}` : ""}`} className="font-semibold text-primary">{t("খুলুন", "Sign up")}</Link></>
            : <>{t("আগেই অ্যাকাউন্ট আছে?", "Already registered?")} <Link href="/login" className="font-semibold text-primary">{t("লগইন", "Log in")}</Link></>}
        </p>
      </form>
    </div>
  );
}
