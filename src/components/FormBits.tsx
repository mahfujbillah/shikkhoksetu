"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ActionResult } from "@/server/errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useT } from "./LanguageProvider";
import { cn } from "@/lib/utils";

type ActionFn = (prev: ActionResult<unknown> | null, fd: FormData) => Promise<ActionResult<unknown>>;

/**
 * <ActionForm> — progressive-enhancement form bound to a Server Action via useActionState.
 * Children can be a render function to read field errors: {(state) => …}.
 */
export function ActionForm({
  action, children, className, onSuccess, resetOnSuccess, hideMessage,
}: {
  action: ActionFn;
  children: React.ReactNode | ((state: ActionResult<unknown> | null) => React.ReactNode);
  className?: string;
  onSuccess?: (s: ActionResult<unknown>) => void;
  resetOnSuccess?: boolean;
  hideMessage?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {typeof children === "function" ? children(state) : children}
      {!hideMessage && <FormMessage state={state} />}
    </form>
  );
}

export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  return (
    <p role="status" className={cn("mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm", state.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
      {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{state.ok ? state.message : state.error}</span>
    </p>
  );
}

export function SubmitButton({ children, pendingText, ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  const { t } = useT();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? pendingText ?? t("অপেক্ষা করুন…", "Please wait…") : children}
    </Button>
  );
}

export function FieldError({ state, name }: { state: ActionResult<unknown> | null; name: string }) {
  const msg = state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;
  return msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null;
}

export function Field({ label, name, state, children, className, hint }: { label: string; name?: string; state?: ActionResult<unknown> | null; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {name && state !== undefined && <FieldError state={state} name={name} />}
    </div>
  );
}

/** Multi-select pill group; submits each selected value as a repeated field. */
export function Chips({ name, options, defaultValue = [], max }: { name: string; options: { value: string; label: string }[]; defaultValue?: string[]; max?: number }) {
  const [picked, setPicked] = useState<string[]>(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = picked.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => setPicked(on ? picked.filter((p) => p !== o.value) : max && picked.length >= max ? picked : [...picked, o.value])}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}
          >
            {o.label}
          </button>
        );
      })}
      {picked.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </div>
  );
}

/** One-click server action button (shortlist, reject, verify…) with inline error. */
export function ActionButton({ action, fields, children, confirm, ...btn }: { action: ActionFn; fields: Record<string, string>; confirm?: string } & React.ComponentProps<typeof Button>) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-flex flex-col items-start">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton {...btn}>{children}</SubmitButton>
      {state && !state.ok && <span className="mt-1 max-w-56 text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
