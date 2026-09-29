import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Inbox, X } from "lucide-react";
import { CITIES, CURRICULA, GRADES, MEDIUMS, SUBJECTS, TUITION_TYPES, areaLabel, cityLabel } from "@/lib/catalog";
import { boardHref, parseBoardParams, toBoardQuery, type BoardParams } from "@/lib/board-params";
import { formatMoney, formatNumber, makeT, type Lang } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { listOpenTuitions } from "@/server/services/posts";
import { getApplyViewer } from "@/server/viewer";
import { TuitionCard } from "@/components/Cards";
import { BoardFilters } from "@/components/BoardFilters";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/tuitions">): Promise<Metadata> {
  const f = parseBoardParams(await searchParams);
  const where = f.online ? "Online" : f.area ? `${areaLabel(f.city, f.area, "en")}, ${cityLabel(f.city, "en")}` : f.city ? cityLabel(f.city, "en") : "";
  const q = toBoardQuery({ ...f, page: undefined });
  return { title: where ? `Tuition jobs in ${where}` : "Tuition job board", alternates: { canonical: q ? `/tuitions?${q}` : "/tuitions" } };
}

const sortedQuery = (s: string) => [...new URLSearchParams(s).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");

/** Removable chips for every active filter (each chip is a plain link → works without JS, shareable). */
function activeChips(f: BoardParams, lang: Lang): { label: string; href: string }[] {
  const t = makeT(lang);
  const chips: { label: string; href: string }[] = [];
  const without = (patch: Partial<BoardParams>) => boardHref({ ...f, ...patch, page: undefined });
  if (f.q) chips.push({ label: `“${f.q}”`, href: without({ q: undefined }) });
  if (f.online) chips.push({ label: t("অনলাইন", "Online"), href: without({ online: undefined }) });
  if (f.city) chips.push({ label: CITIES.find((c) => c.code === f.city)![lang], href: without({ city: undefined, area: undefined }) });
  if (f.area) chips.push({ label: areaLabel(f.city, f.area, lang), href: without({ area: undefined }) });
  if (f.medium) chips.push({ label: MEDIUMS.find((m) => m.code === f.medium)![lang], href: without({ medium: undefined, curriculum: undefined }) });
  if (f.curriculum) chips.push({ label: CURRICULA[f.curriculum][lang], href: without({ curriculum: undefined }) });
  if (f.grade) chips.push({ label: GRADES.find((g) => g.code === f.grade)![lang], href: without({ grade: undefined }) });
  if (f.subject) chips.push({ label: SUBJECTS.find((s) => s.code === f.subject)![lang], href: without({ subject: undefined }) });
  if (f.type) chips.push({ label: TUITION_TYPES[f.type][lang], href: without({ type: undefined }) });
  if (f.tgender) chips.push({ label: f.tgender === "MALE" ? t("পুরুষ শিক্ষক", "Male tutor") : t("নারী শিক্ষক", "Female tutor"), href: without({ tgender: undefined }) });
  if (f.min) chips.push({ label: `≥ ${formatMoney(f.min, lang)}`, href: without({ min: undefined }) });
  if (f.max) chips.push({ label: `≤ ${formatMoney(f.max, lang)}`, href: without({ max: undefined }) });
  if (f.sort) chips.push({ label: t("বেশি সম্মানী আগে", "Highest salary"), href: without({ sort: undefined }) });
  return chips;
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, pages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) out.push(p);
    else if (out.at(-1) !== "…") out.push("…");
  }
  return out;
}

export default async function TuitionsBoard({ searchParams }: PageProps<"/tuitions">) {
  const sp = await searchParams;
  const filters = parseBoardParams(sp);
  const { t, lang } = await getT();
  const { items, total, page, pages, pageSize } = await listOpenTuitions(filters);

  // One canonical URL per filter set: lower-case slugs, invalid/broken chains dropped, page clamped.
  const canonical = toBoardQuery({ ...filters, page });
  const raw = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();
  if (sortedQuery(canonical) !== sortedQuery(raw)) redirect(canonical ? `/tuitions?${canonical}` : "/tuitions");

  const viewer = await getApplyViewer(items.map((i) => i.id));
  const chips = activeChips(filters, lang);
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pageHref = (p: number) => boardHref({ ...filters, page: p });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">{t("টিউশন জব বোর্ড", "Tuition job board")}</h1>
          <p className="mt-2 text-muted-foreground">{t("অভিভাবকদের সরাসরি পোস্ট করা লাইভ টিউশন — হোম, অনলাইন ও ব্যাচ।", "Live tuition requests posted directly by guardians — home, online and batch.")}</p>
        </div>
        {viewer.role !== "TUTOR" && <Link href="/post-tuition" className={buttonVariants({ variant: "accent" })}>{t("টিউশন পোস্ট করুন", "Post a tuition")}</Link>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside><Suspense><BoardFilters /></Suspense></aside>
        <section aria-labelledby="results-heading">
          <p id="results-heading" className="text-sm text-muted-foreground" aria-live="polite">
            {total
              ? t(`${formatNumber(total, lang)}টি টিউশনের মধ্যে ${formatNumber(from, lang)}–${formatNumber(to, lang)} দেখানো হচ্ছে`, `Showing ${from}–${to} of ${total} tuitions`)
              : t("০টি টিউশন", "0 tuitions")}
          </p>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link key={c.href + c.label} href={c.href} scroll={false} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10" aria-label={t(`${c.label} ফিল্টার সরান`, `Remove filter ${c.label}`)}>
                  {c.label} <X className="size-3" />
                </Link>
              ))}
              <Link href="/tuitions" scroll={false} className="text-xs font-semibold text-muted-foreground hover:text-foreground">{t("সব মুছুন", "Clear all")}</Link>
            </div>
          )}

          {items.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Inbox className="size-10" />
              <p className="mt-3">{t("এই ফিল্টারে কোনো টিউশন নেই। ফিল্টার কমিয়ে দেখুন।", "No tuitions match these filters. Try widening them.")}</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">{items.map((p) => <TuitionCard key={p.id} post={p} lang={lang} viewer={viewer} />)}</div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label={t("পৃষ্ঠা", "Pagination")}>
              {page > 1 ? <Link href={pageHref(page - 1)} rel="prev" className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={t("আগের পৃষ্ঠা", "Previous page")}><ChevronLeft /></Link> : null}
              {pageWindow(page, pages).map((p, i) => p === "…"
                ? <span key={`gap-${i}`} className="px-2 text-muted-foreground">…</span>
                : <Link key={p} href={pageHref(p)} aria-current={p === page ? "page" : undefined} className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }), "min-w-9")}>{formatNumber(p, lang)}</Link>)}
              {page < pages ? <Link href={pageHref(page + 1)} rel="next" className={buttonVariants({ variant: "outline", size: "sm" })} aria-label={t("পরের পৃষ্ঠা", "Next page")}><ChevronRight /></Link> : null}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
