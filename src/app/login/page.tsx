"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Info } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { isConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useLang();
  const { refresh } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"guardian" | "tutor">("guardian");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const a = t.auth;

  const next = () => {
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isConfigured) return setMsg({ ok: false, text: t.formNote });
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    setBusy(true);
    setMsg(null);
    const sb = supabase();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      await refresh();
      router.push(next());
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: String(fd.get("full_name")) }, emailRedirectTo: `${window.location.origin}/login` },
      });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (data.session) {
        await refresh();
        router.push(role === "tutor" ? "/become-tutor" : next());
      } else setMsg({ ok: true, text: a.checkEmail });
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="flex justify-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><GraduationCap className="size-6" /></span>
      </div>
      <h1 className="mt-4 text-center font-display text-3xl font-bold">{mode === "login" ? a.loginTitle : a.signupTitle}</h1>

      <div className="mt-6 grid grid-cols-2 rounded-full border border-border bg-card p-1 text-sm font-semibold">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setMsg(null); }} className={`rounded-full py-2 transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "login" ? a.login : a.signup}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        {mode === "signup" && (
          <>
            <div>
              <span className="mb-1.5 block text-sm font-medium">{a.iAm}</span>
              <div className="grid grid-cols-2 gap-2">
                {(["guardian", "tutor"] as const).map((r) => (
                  <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-xl border py-2.5 text-sm font-semibold transition ${role === r ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    {a[r]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{a.fullName}</span>
              <input name="full_name" className="field" required />
            </label>
          </>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{a.email}</span>
          <input name="email" type="email" className="field" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{a.password}</span>
          <input name="password" type="password" minLength={6} className="field" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {msg && (
          <p className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-600"}`}>
            <Info className="mt-0.5 size-4 shrink-0" /> {msg.text}
          </p>
        )}
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
          {busy ? a.wait : mode === "login" ? a.login : a.signup}
        </button>
      </form>
    </div>
  );
}
