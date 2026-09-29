"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, LogIn } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { useAuth, type Role } from "./AuthProvider";
import { isConfigured } from "@/lib/supabase";

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Multi-select pills. Selected indexes are submitted as repeated hidden inputs named `name`. */
export function Chips({ options, name, offset = 0, initial = [] }: { options: string[]; name: string; offset?: number; initial?: number[] }) {
  const [picked, setPicked] = useState<number[]>(initial);
  useEffect(() => setPicked(initial), [initial.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o, i) => {
        const v = i + offset;
        const on = picked.includes(v);
        return (
          <button
            type="button"
            key={i}
            onClick={() => setPicked(on ? picked.filter((p) => p !== v) : [...picked, v])}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
            aria-pressed={on}
          >
            {o}
          </button>
        );
      })}
      {picked.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </div>
  );
}

export const nums = (fd: FormData, key: string) => fd.getAll(key).map(Number);

type ShellProps = {
  title: string;
  desc: string;
  submit: string;
  children: React.ReactNode;
  /** Role required to use the form once the backend is on. */
  role?: Role;
  gateText?: string;
  /** Return an error message, or null on success. */
  onSubmit?: (fd: FormData) => Promise<string | null>;
  doneText?: string;
};

export function FormShell({ title, desc, submit, children, role, gateText, onSubmit, doneText }: ShellProps) {
  const { t } = useLang();
  const { user, profile, loading } = useAuth();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const blocked = isConfigured && role && !loading && (!user || (profile && profile.role !== role && profile.role !== "admin"));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{desc}</p>
      {!isConfigured && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-accent bg-accent/10 px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" /> {t.formNote}
        </p>
      )}

      {blocked ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
          <LogIn className="size-10 text-primary" />
          <p className="mt-4 font-semibold">{gateText ?? t.auth.needLogin}</p>
          <Link href={`/login?next=${typeof window !== "undefined" ? window.location.pathname : "/"}`} className="mt-5 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground">
            {t.auth.goLogin}
          </Link>
        </div>
      ) : done ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="mt-4 font-semibold">{isConfigured ? (doneText ?? t.saved) : t.formDone}</p>
          {isConfigured && <Link href="/dashboard" className="mt-5 font-semibold text-primary underline">{t.dash.title}</Link>}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!isConfigured || !onSubmit) return setDone(true);
            setBusy(true);
            setError("");
            const err = await onSubmit(new FormData(e.currentTarget));
            setBusy(false);
            if (err) setError(err);
            else setDone(true);
          }}
          className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          {children}
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 sm:col-span-2">{t.auth.error}: {error}</p>}
          <button type="submit" disabled={busy} className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:col-span-2">
            {busy ? t.auth.wait : submit}
          </button>
        </form>
      )}
    </div>
  );
}
