import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inbox } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/i18n";
import { listOpenTuitions, type BoardFilters as F } from "@/server/services/posts";
import { getApplyViewer } from "@/server/viewer";
import { TuitionCard } from "@/components/Cards";
import { BoardFilters } from "@/components/BoardFilters";
import { buttonVariants } from "@/components/ui/button";
import type { Curriculum, TuitionType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Tuition job board" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export default async function TuitionsBoard({ searchParams }: PageProps<"/tuitions">) {
  const sp = await searchParams;
  const { t, lang } = await getT();
  const filters: F = {
    q: one(sp.q)?.slice(0, 80), subject: one(sp.subject), grade: one(sp.grade), curriculum: one(sp.curriculum) as Curriculum | undefined,
    type: one(sp.type) as TuitionType | undefined, city: one(sp.city), area: one(sp.area), online: one(sp.online) === "1",
    minSalary: num(one(sp.min)), maxSalary: num(one(sp.max)), sort: one(sp.sort) === "salary" ? "salary" : "new", page: num(one(sp.page)),
  };
  const { items, total, page, pages } = await listOpenTuitions(filters);
  const viewer = await getApplyViewer(items.map((i) => i.id));
  const pageHref = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
    q.set("page", String(p));
    return `/tuitions?${q}`;
  };

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
        <section>
          <p className="text-sm text-muted-foreground">{formatNumber(total, lang)} {t("টি টিউশন পাওয়া গেছে", "tuitions found")}</p>
          {items.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Inbox className="size-10" />
              <p className="mt-3">{t("এই ফিল্টারে কোনো টিউশন নেই। ফিল্টার কমিয়ে দেখুন।", "No tuitions match these filters. Try widening them.")}</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">{items.map((p) => <TuitionCard key={p.id} post={p} lang={lang} viewer={viewer} />)}</div>
          )}
          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>←</Link>}
              <span className="text-sm text-muted-foreground">{formatNumber(page, lang)} / {formatNumber(pages, lang)}</span>
              {page < pages && <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>→</Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
