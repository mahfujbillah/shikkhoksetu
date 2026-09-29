"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { DemoNotice, TuitionCard } from "@/components/Cards";
import { useTuitions } from "@/lib/data";

const empty = { cls: "", subject: "", area: "", medium: "", gender: "" };

export default function TuitionsPage() {
  const { t, num } = useLang();
  const o = t.options;
  const [f, setF] = useState(empty);
  const { items: tuitions, loading } = useTuitions();

  const list = useMemo(
    () =>
      tuitions.filter(
        (x) =>
          (f.cls === "" || x.cls === +f.cls) &&
          (f.subject === "" || x.subjects.includes(+f.subject)) &&
          (f.area === "" || x.area === +f.area) &&
          (f.medium === "" || x.medium === +f.medium) &&
          (f.gender === "" || x.gender === +f.gender),
      ),
    [f, tuitions],
  );

  const sel = (key: keyof typeof empty, label: string, opts: string[], allLabel: string) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select className="field" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}>
        <option value="">{allLabel}</option>
        {opts.map((c, i) => <option key={i} value={i}>{c}</option>)}
      </select>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t.board.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.board.desc}</p>
      <div className="mt-4"><DemoNotice /></div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4" /> {t.board.filters}</h2>
          {sel("cls", t.hero.searchClass, o.classes, t.board.allClasses)}
          {sel("subject", t.hero.searchSubject, o.subjects, t.board.allSubjects)}
          {sel("area", t.hero.searchArea, o.areas, t.board.allAreas)}
          {sel("medium", t.board.medium, o.mediums, t.board.any)}
          {sel("gender", t.board.gender, o.genders, t.board.any)}
          <button onClick={() => setF(empty)} className="w-full rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted">{t.board.reset}</button>
        </aside>

        <div>
          <p className="text-sm text-muted-foreground">{loading ? t.auth.wait : `${num(list.length)} ${t.board.results}`}</p>
          {loading ? null : list.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t.board.none}</p>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {list.map((x) => <TuitionCard key={x.id} item={x} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
