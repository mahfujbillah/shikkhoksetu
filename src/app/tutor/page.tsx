"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, BookOpen, GraduationCap, MapPin, Phone, Star, Wallet } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { isConfigured, supabase } from "@/lib/supabase";
import { tutors as demoTutors } from "@/lib/demo-data";

type Full = {
  id: string | number; full_name: string; gender: number; institution: string; degree: string | null; subjects: number[];
  classes: number[]; areas: number[]; experience: number; salary: number | null; bio: string | null; verified: boolean;
  rating: number; reviews_count: number;
};

export default function TutorProfilePage() {
  const { t, num } = useLang();
  const { profile } = useAuth();
  const o = t.options;
  const p = t.tutorPage;
  const [tutor, setTutor] = useState<Full | null | undefined>(undefined);
  const [phone, setPhone] = useState<string | null>(null);
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return setTutor(null);
    if (!isConfigured) {
      const d = demoTutors.find((x) => String(x.id) === id);
      return setTutor(d ? { id: d.id, full_name: d.name.bn, gender: d.gender, institution: d.institution.bn, degree: null, subjects: d.subjects, classes: [], areas: d.areas, experience: d.exp, salary: d.salary, bio: null, verified: d.verified, rating: d.rating, reviews_count: d.reviews } : null);
    }
    const sb = supabase();
    sb.from("tutors").select("*").eq("id", id).maybeSingle().then(({ data }) => setTutor((data as Full) ?? null));
    // Only returns a row for the tutor, admins, or a guardian who accepted this tutor (database rule)
    sb.from("tutor_contacts").select("phone").eq("tutor_id", id).maybeSingle().then(({ data }) => setPhone(data?.phone ?? null));
  }, [profile?.id]);

  const toggleVerify = async () => {
    if (!tutor) return;
    const { data } = await supabase().from("tutors").update({ verified: !tutor.verified }).eq("id", tutor.id).select("*").single();
    if (data) setTutor(data as Full);
  };

  if (tutor === undefined) return <Wrap><p className="text-muted-foreground">{t.auth.wait}</p></Wrap>;
  if (tutor === null) return <Wrap><p className="text-muted-foreground">{p.notFound}</p></Wrap>;

  const initials = tutor.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const chips = (idx: number[], list: string[]) =>
    idx.length ? <div className="mt-2 flex flex-wrap gap-1.5">{idx.map((i) => <span key={i} className="rounded-full bg-muted px-3 py-1 text-sm">{list[i]}</span>)}</div> : <p className="mt-2 text-sm text-muted-foreground">—</p>;

  return (
    <Wrap>
      <Link href="/tutors" className="text-sm font-semibold text-primary hover:underline">{p.back}</Link>

      <div className="mt-5 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className={`grid size-20 shrink-0 place-items-center rounded-full font-display text-2xl font-bold ${tutor.gender === 2 ? "bg-accent/20 text-accent-foreground" : "bg-primary/15 text-primary"}`}>{initials}</div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-bold">
              {tutor.full_name}
              {tutor.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary"><BadgeCheck className="size-4" /> {t.directory.verified}</span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">{p.notVerified}</span>
              )}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><GraduationCap className="size-4" /> {tutor.institution}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="size-4 fill-accent text-accent" /> {num(Number(tutor.rating).toFixed(1))} · {num(tutor.reviews_count)} {t.directory.reviews} · {num(tutor.experience)} {t.directory.exp}
            </p>
          </div>
          {isAdmin && isConfigured && (
            <button onClick={toggleVerify} className={`rounded-full px-4 py-2 text-sm font-semibold ${tutor.verified ? "border border-border" : "bg-primary text-primary-foreground"}`}>
              {tutor.verified ? t.admin.unverify : t.admin.verify}
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Section icon={<BookOpen className="size-4" />} title={p.teaches}>{chips(tutor.subjects, o.subjects)}</Section>
          <Section icon={<BookOpen className="size-4" />} title={p.classes}>{chips(tutor.classes, o.classes)}</Section>
          <Section icon={<MapPin className="size-4" />} title={p.areas}>{chips(tutor.areas, o.areas)}</Section>
          <Section icon={<Wallet className="size-4" />} title={p.expected}>
            <p className="mt-2 text-lg font-bold text-primary">{tutor.salary ? `৳${num(tutor.salary)}${t.board.perMonth}` : "—"}</p>
          </Section>
          {tutor.degree && <Section icon={<GraduationCap className="size-4" />} title={p.degree}><p className="mt-2">{tutor.degree}</p></Section>}
          <Section icon={<Phone className="size-4" />} title={p.phone}>
            {phone ? <a href={`tel:${phone}`} className="mt-2 inline-block text-lg font-bold text-primary">{phone}</a> : <p className="mt-2 text-sm text-muted-foreground">{p.phoneHidden}</p>}
          </Section>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="font-semibold">{p.about}</h2>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{tutor.bio || p.noBio}</p>
        </div>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-12">{children}</div>;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">{icon} {title}</h3>
      {children}
    </div>
  );
}
