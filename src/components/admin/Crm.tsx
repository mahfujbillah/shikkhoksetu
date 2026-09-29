import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteForm } from "./CrmForms";

export const PAGE_SIZE = 50;

/** Reads ?page= (1-based) and returns skip/take for Prisma. */
export function paging(sp: Record<string, string | string[] | undefined>) {
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  return { page, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function CrmHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ExportLink({ entity, query }: { entity: string; query?: Record<string, string | undefined> }) {
  const qs = new URLSearchParams(Object.entries(query ?? {}).filter(([, v]) => v) as [string, string][]).toString();
  return <a href={`/admin/export/${entity}${qs ? `?${qs}` : ""}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Download /> CSV</a>;
}

/** Pill filter row: each option is a link that sets one query param, keeping the others. */
export function FilterPills({ base, param, value, options, sp }: { base: string; param: string; value?: string; options: [string, string][]; sp: Record<string, string | string[] | undefined> }) {
  const href = (v: string) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) if (k !== param && k !== "page" && typeof val === "string" && val) q.set(k, val);
    if (v) q.set(param, v);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {options.map(([v, l]) => (
        <Link key={v || "all"} href={href(v)} className={cn("rounded-full px-3 py-1 text-xs font-medium", (value ?? "") === v ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary")}>{l}</Link>
      ))}
    </div>
  );
}

export function SearchBox({ q, placeholder, hidden }: { q?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form className="mb-3 flex max-w-md gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <input name="q" defaultValue={q} placeholder={placeholder} className="h-9 w-full rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary" />
      <button className={buttonVariants({ size: "sm" })}>↵</button>
    </form>
  );
}

export function Pager({ base, sp, page, total }: { base: string; sp: Record<string, string | string[] | undefined>; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted-foreground">{total} total</p>;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "page" && typeof v === "string" && v) q.set(k, v);
    q.set("page", String(p));
    return `${base}?${q}`;
  };
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className={buttonVariants({ size: "sm", variant: "outline" })}><ChevronLeft /></Link> : null}
      <span className="text-muted-foreground">{page} / {pages} · {total} total</span>
      {page < pages ? <Link href={href(page + 1)} className={buttonVariants({ size: "sm", variant: "outline" })}><ChevronRight /></Link> : null}
    </div>
  );
}

/** Simple responsive table. On phones it scrolls horizontally inside its card. */
export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>{head.map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
        {empty && <p className="p-8 text-center text-sm text-muted-foreground">—</p>}
      </div>
    </Card>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

export function Section({ title, children, action, className }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold">{title}</h3>{action}</div>
      {children}
    </Card>
  );
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words">{v ?? "—"}</dd></div>)}
    </dl>
  );
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-medium text-primary hover:underline">{children}</Link>;
}

/** Tiny dependency-free bar chart for daily series. */
export function Bars({ data, label, format = String }: { data: { day: string; v: number }[]; label: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const total = data.reduce((s, d) => s + d.v, 0);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between"><p className="text-sm font-semibold">{label}</p><p className="font-display text-lg font-bold text-primary">{format(total)}</p></div>
      <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={`${label}: ${format(total)} in ${data.length} days`}>
        {data.map((d) => (
          <div key={d.day} title={`${d.day}: ${format(d.v)}`} className="flex-1 rounded-t-sm bg-primary/80 transition hover:bg-primary" style={{ height: `${Math.max(d.v ? 6 : 2, (d.v / max) * 100)}%`, opacity: d.v ? 1 : 0.25 }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{data[0]?.day.slice(5)}</span><span>{data.at(-1)?.day.slice(5)}</span></div>
    </Card>
  );
}

/** Admin notes list + add form (notes are AuditLog rows with action ADMIN_NOTE). */
export function NotesPanel({ title, entity, entityId, notes, when }: { title: string; entity: string; entityId: string; notes: { id: string; meta: unknown; createdAt: Date; actor: { fullName: string } | null }[]; when: (d: Date) => string }) {
  return (
    <Section title={title}>
      <NoteForm entity={entity} entityId={entityId} />
      <ul className="mt-3 space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-muted/60 p-2.5">
            <p className="whitespace-pre-wrap">{(n.meta as { text?: string } | null)?.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.actor?.fullName} · {when(n.createdAt)}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
