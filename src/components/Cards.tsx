"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { BadgeCheck, CalendarDays, Clock, MapPin, Star, Users } from "lucide-react";
import { useLang } from "./LanguageProvider";
import type { Tuition, Tutor } from "@/lib/demo-data";

export function DemoNotice() {
  const { t } = useLang();
  if (isConfigured) return null;
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-dashed border-accent bg-accent/10 px-3 py-1 text-xs text-foreground/80">
      <span className="size-1.5 rounded-full bg-accent" /> {t.demo}
    </p>
  );
}

export function TuitionCard({ item }: { item: Tuition }) {
  const { t, num, lang } = useLang();
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const { user, profile } = useAuth();
  const router = useRouter();
  const o = t.options;

  const apply = async () => {
    if (!isConfigured) return setApplied(true);
    if (!user) return router.push("/login?next=/tuitions");
    if (profile?.role !== "tutor") return setMsg(t.auth.needTutor);
    setBusy(true);
    const { error } = await supabase().from("applications").insert({ tuition_id: item.id, tutor_id: user.id });
    setBusy(false);
    if (!error || error.code === "23505") return setApplied(true);
    if (error.code === "23503") return setMsg(t.auth.needProfile);
    setMsg(`${t.auth.error}: ${error.message}`);
  };
  const posted = item.postedDaysAgo === 0 ? (lang === "bn" ? "আজ" : "today") : lang === "bn" ? `${num(item.postedDaysAgo)} দিন আগে` : `${item.postedDaysAgo}d ago`;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{o.mediums[item.medium]}</span>
          <h3 className="mt-2 text-base font-bold leading-snug">
            {o.classes[item.cls]} — {item.subjects.map((s) => o.subjects[s]).join(", ")}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-bold text-primary">৳{num(item.salary)}</div>
          <div className="text-xs text-muted-foreground">{t.board.perMonth}</div>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0" /> {o.areas[item.area]}</li>
        <li className="flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0" /> {num(item.days)} {t.board.daysWeek}</li>
        <li className="flex items-center gap-1.5"><Users className="size-4 shrink-0" /> {t.board.gender}: {o.genders[item.gender]}</li>
        <li className="flex items-center gap-1.5"><Clock className="size-4 shrink-0" /> {t.board.posted} {posted}</li>
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">{num(item.applicants + (applied ? 1 : 0))} {t.board.applicants}</span>
        <button
          onClick={apply}
          disabled={applied || busy}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${applied ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:brightness-110"}`}
        >
          {applied ? (isConfigured ? t.board.applied.replace(/\s*\((ডেমো|demo)\)/, "") : t.board.applied) : busy ? t.auth.wait : t.board.apply}
        </button>
      </div>
      {msg && <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-xs">{msg} {msg === t.auth.needProfile && <a href="/become-tutor" className="font-semibold text-primary underline">{t.nav.become}</a>}</p>}
    </article>
  );
}

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const { t, num, lang } = useLang();
  const o = t.options;
  const name = tutor.name[lang];
  const initials = tutor.name.en.split(" ").map((w) => w[0]).join("");

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`grid size-14 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${tutor.gender === 2 ? "bg-accent/20 text-accent-foreground" : "bg-primary/15 text-primary"}`}>
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-bold">
            {name}
            {tutor.verified && <BadgeCheck className="size-4 text-primary" aria-label={t.directory.verified} />}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{tutor.institution[lang]}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {tutor.subjects.map((s) => (
          <span key={s} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{o.subjects[s]}</span>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5"><MapPin className="size-4" /> {tutor.areas.map((a) => o.areas[a]).join(", ")}</li>
        <li className="flex items-center gap-1.5">
          <Star className="size-4 fill-accent text-accent" /> {num(tutor.rating.toFixed(1))} · {num(tutor.reviews)} {t.directory.reviews} · {num(tutor.exp)} {t.directory.exp}
        </li>
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm">
          <span className="text-muted-foreground">{t.directory.from} </span>
          <span className="font-bold text-primary">৳{num(tutor.salary)}</span>
          <span className="text-muted-foreground">{t.board.perMonth}</span>
        </div>
        <button className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground">
          {t.directory.view}
        </button>
      </div>
    </article>
  );
}
