"use client";

import { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { useLang } from "./LanguageProvider";

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Chips({ options }: { options: string[] }) {
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o, i) => {
        const on = picked.includes(i);
        return (
          <button
            type="button"
            key={i}
            onClick={() => setPicked(on ? picked.filter((p) => p !== i) : [...picked, i])}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
            aria-pressed={on}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function FormShell({ title, desc, submit, children }: { title: string; desc: string; submit: string; children: React.ReactNode }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{desc}</p>
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-accent bg-accent/10 px-3 py-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" /> {t.formNote}
      </p>

      {done ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="mt-4 font-semibold">{t.formDone}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
          className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          {children}
          <button type="submit" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110 sm:col-span-2">
            {submit}
          </button>
        </form>
      )}
    </div>
  );
}
