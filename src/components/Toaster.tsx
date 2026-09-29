"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
type Item = { id: number; kind: Kind; text: string; action?: { label: string; href: string } };
const EVENT = "app:toast";
let seq = 0;

function emit(kind: Kind, text: string, action?: Item["action"]) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: { id: ++seq, kind, text, action } }));
}

/** Fire-and-forget notifications: toast.error("…"), toast.success("…", { label, href }). */
export const toast = {
  success: (text: string, action?: Item["action"]) => emit("success", text, action),
  error: (text: string, action?: Item["action"]) => emit("error", text, action),
  info: (text: string, action?: Item["action"]) => emit("info", text, action),
};

/** Mounted once in the root layout. Announces toasts to screen readers via aria-live. */
export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const it = (e as CustomEvent<Item>).detail;
      setItems((xs) => [...xs.filter((x) => x.text !== it.text), it].slice(-3));
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== it.id)), 5000);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((it) => {
        const Icon = it.kind === "success" ? CheckCircle2 : it.kind === "error" ? AlertCircle : Info;
        return (
          <div key={it.id} role={it.kind === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-card p-4 text-sm shadow-lg", it.kind === "error" ? "border-destructive/40" : it.kind === "success" ? "border-success/40" : "border-border")}>
            <Icon className={cn("mt-0.5 size-5 shrink-0", it.kind === "error" ? "text-destructive" : it.kind === "success" ? "text-success" : "text-primary")} />
            <div className="min-w-0 flex-1">
              <p>{it.text}</p>
              {it.action && <a href={it.action.href} className="mt-1 inline-block font-semibold text-primary hover:underline">{it.action.label} →</a>}
            </div>
            <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss"><X className="size-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
