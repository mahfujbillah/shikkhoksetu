"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, Search, ShieldCheck, Star, UserRoundCheck, Video } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { DemoNotice, TuitionCard, TutorCard } from "@/components/Cards";
import { useTuitions, useTutors } from "@/lib/data";

export default function Home() {
  const { t, num } = useLang();
  const router = useRouter();
  const [q, setQ] = useState({ cls: "", subject: "", area: "" });
  const { items: tuitions } = useTuitions(6);
  const { items: tutors } = useTutors(3);
  const o = t.options;
  const trustIcons = [ShieldCheck, Video, Star, UserRoundCheck];

  const search = () => {
    const p = new URLSearchParams();
    if (q.subject) p.set("subject", q.subject);
    if (q.area) p.set("area", q.area);
    router.push(`/tutors${p.size ? `?${p}` : ""}`);
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 size-[420px] rounded-full bg-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-3.5 text-primary" /> {t.hero.badge}
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {t.hero.title1} <span className="text-primary">{t.hero.title2}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{t.hero.desc}</p>

          <div className="mt-8 grid gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-primary/5 md:grid-cols-[1fr_1fr_1fr_auto]">
            <select className="field border-transparent" value={q.cls} onChange={(e) => setQ({ ...q, cls: e.target.value })} aria-label={t.hero.searchClass}>
              <option value="">{t.hero.searchClass}</option>
              {o.classes.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
            <select className="field border-transparent" value={q.subject} onChange={(e) => setQ({ ...q, subject: e.target.value })} aria-label={t.hero.searchSubject}>
              <option value="">{t.hero.searchSubject}</option>
              {o.subjects.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
            <select className="field border-transparent" value={q.area} onChange={(e) => setQ({ ...q, area: e.target.value })} aria-label={t.hero.searchArea}>
              <option value="">{t.hero.searchArea}</option>
              {o.areas.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
            <button onClick={search} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110">
              <Search className="size-4" /> {t.hero.searchBtn}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link href="/post-tuition" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">{t.hero.forGuardian} <ArrowRight className="size-4" /></Link>
            <span className="text-border">|</span>
            <Link href="/tuitions" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">{t.hero.forTutor} <ArrowRight className="size-4" /></Link>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {t.stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card/70 p-4">
                <dt className="font-display text-2xl font-bold text-primary">{s.value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="scroll-mt-20 border-y border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t.how.eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{t.how.title}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              { title: t.how.guardianTitle, steps: t.how.guardian, tone: "bg-accent text-accent-foreground" },
              { title: t.how.tutorTitle, steps: t.how.tutor, tone: "bg-primary text-primary-foreground" },
            ].map((col) => (
              <div key={col.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="size-5 text-primary" /> {col.title}</h3>
                <ol className="mt-5 space-y-5">
                  {col.steps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${col.tone}`}>{num(i + 1)}</span>
                      <div>
                        <p className="font-semibold">{s.title}</p>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST TUITIONS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionHead eyebrow={t.latest.eyebrow} title={t.latest.title} href="/tuitions" all={t.latest.all} />
        <div className="mt-3"><DemoNotice /></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tuitions.slice(0, 6).map((x) => <TuitionCard key={x.id} item={x} />)}
        </div>
      </section>

      {/* FEATURED TUTORS */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <SectionHead eyebrow={t.featured.eyebrow} title={t.featured.title} href="/tutors" all={t.featured.all} />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.slice(0, 3).map((x) => <TutorCard key={x.id} tutor={x} />)}
        </div>
      </section>

      {/* TRUST */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t.trust.eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{t.trust.title}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.trust.items.map((it, i) => {
            const Icon = trustIcons[i];
            return (
              <div key={it.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                <p className="mt-4 font-semibold">{it.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
          <h2 className="font-display text-3xl font-bold">{t.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">{t.cta.desc}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/post-tuition" className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground hover:brightness-95">{t.cta.guardian}</Link>
            <Link href="/become-tutor" className="rounded-full border border-primary-foreground/40 px-6 py-3 font-semibold hover:bg-primary-foreground/10">{t.cta.tutor}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, href, all }: { eyebrow: string; title: string; href: string; all: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
      </div>
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{all} <ArrowRight className="size-4" /></Link>
    </div>
  );
}
