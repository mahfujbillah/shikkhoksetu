"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { DemoNotice, TutorCard } from "@/components/Cards";
import { tutors } from "@/lib/demo-data";

export default function TutorsPage() {
  const { t, num, lang } = useLang();
  const o = t.options;
  const [f, setF] = useState({ subject: "", area: "", gender: "" });

  // Pick up ?subject=&area= from the home-page search (read on the client to keep the page static)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setF((prev) => ({ ...prev, subject: p.get("subject") ?? "", area: p.get("area") ?? "" }));
  }, []);

  const list = useMemo(
    () =>
      tutors.filter(
        (x) =>
          (f.subject === "" || f.subject === "0" || x.subjects.includes(+f.subject)) &&
          (f.area === "" || x.areas.includes(+f.area)) &&
          (f.gender === "" || f.gender === "0" || x.gender === +f.gender),
      ),
    [f],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t.directory.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.directory.desc}</p>
      <div className="mt-4"><DemoNotice /></div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-3">
        <select className="field" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} aria-label={t.hero.searchSubject}>
          <option value="">{t.board.allSubjects}</option>
          {o.subjects.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
        <select className="field" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} aria-label={t.hero.searchArea}>
          <option value="">{t.board.allAreas}</option>
          {o.areas.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
        <select className="field" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} aria-label={t.board.gender}>
          {o.genders.map((c, i) => <option key={i} value={i === 0 ? "" : i}>{t.board.gender}: {c}</option>)}
        </select>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">{num(list.length)} {lang === "en" ? "tutors" : "জন শিক্ষক"}</p>
      {list.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t.board.none}</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((x) => <TutorCard key={x.id} tutor={x} />)}
        </div>
      )}
    </div>
  );
}
