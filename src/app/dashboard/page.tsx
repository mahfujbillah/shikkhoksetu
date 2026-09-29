"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Phone } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { isConfigured, supabase } from "@/lib/supabase";
import { TUITION_COLS } from "@/lib/data";

type T = { id: number; cls: number; subjects: number[]; area: number; salary: number; days: number; status: string; applicants_count: number };
type App = { id: number; status: "pending" | "accepted" | "rejected"; tuition_id: number; tutor_id: string; tutors?: { full_name: string; institution: string; verified: boolean; experience: number } };

export default function DashboardPage() {
  const { t, num } = useLang();
  const { user, profile, loading } = useAuth();

  if (!isConfigured) return <Shell title={t.dash.title}><p className="text-muted-foreground">{t.formNote}</p></Shell>;
  if (loading) return <Shell title={t.dash.title}><p className="text-muted-foreground">{t.auth.wait}</p></Shell>;
  if (!user || !profile)
    return (
      <Shell title={t.dash.title}>
        <Link href="/login?next=/dashboard" className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground">{t.auth.goLogin}</Link>
      </Shell>
    );

  return (
    <Shell title={t.dash.title} sub={`${profile.full_name} · ${profile.role === "tutor" ? t.auth.tutor : profile.role === "admin" ? "Admin" : t.auth.guardian}`}>
      {profile.role === "admin" && <Link href="/admin" className="mb-6 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">{t.dash.admin}</Link>}
      {profile.role === "tutor" ? <TutorView userId={user.id} num={num} /> : <GuardianView userId={user.id} num={num} />}
    </Shell>
  );
}

function Shell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function useTitle() {
  const { t } = useLang();
  return (x: { cls: number; subjects: number[] }) => `${t.options.classes[x.cls]} — ${x.subjects.map((s) => t.options.subjects[s]).join(", ")}`;
}

function GuardianView({ userId, num }: { userId: string; num: (n: number | string) => string }) {
  const { t } = useLang();
  const title = useTitle();
  const [items, setItems] = useState<T[] | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [phones, setPhones] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const sb = supabase();
    const { data } = await sb.from("tuitions").select(TUITION_COLS).eq("guardian_id", userId).order("created_at", { ascending: false });
    const list = (data as T[]) ?? [];
    setItems(list);
    if (!list.length) return;
    const { data: a } = await sb
      .from("applications")
      .select("id, status, tuition_id, tutor_id, tutors(full_name, institution, verified, experience)")
      .in("tuition_id", list.map((x) => x.id))
      .order("created_at");
    setApps((a as unknown as App[]) ?? []);
    const { data: c } = await sb.from("tutor_contacts").select("tutor_id, phone");
    setPhones(Object.fromEntries(((c as { tutor_id: string; phone: string }[]) ?? []).map((r) => [r.tutor_id, r.phone])));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: "accepted" | "rejected") => {
    await supabase().from("applications").update({ status }).eq("id", id);
    load();
  };
  const close = async (id: number) => {
    await supabase().from("tuitions").update({ status: "closed" }).eq("id", id);
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.dash.myTuitions}</h2>
        <Link href="/post-tuition" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">{t.nav.post}</Link>
      </div>
      {items === null ? <p className="mt-4 text-muted-foreground">{t.auth.wait}</p> : items.length === 0 ? <p className="mt-4 text-muted-foreground">{t.dash.noTuitions}</p> : (
        <div className="mt-4 space-y-4">
          {items.map((x) => {
            const list = apps.filter((a) => a.tuition_id === x.id);
            return (
              <div key={x.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{title(x)}</p>
                    <p className="text-sm text-muted-foreground">{t.options.areas[x.area]} · ৳{num(x.salary)}{t.board.perMonth} · {num(x.days)} {t.board.daysWeek}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${x.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{x.status === "open" ? t.dash.open : t.dash.closed}</span>
                    {x.status === "open" && <button onClick={() => close(x.id)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">{t.dash.close}</button>}
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold">{t.dash.applicantsList} ({num(list.length)})</p>
                {list.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">{t.dash.noApplicants}</p> : (
                  <ul className="mt-2 divide-y divide-border">
                    {list.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                        <div>
                          <Link href={`/tutor?id=${a.tutor_id}`} className="flex items-center gap-1 font-medium hover:text-primary">{a.tutors?.full_name}{a.tutors?.verified && <BadgeCheck className="size-4 text-primary" />}</Link>
                          <span className="text-muted-foreground">{a.tutors?.institution} · {num(a.tutors?.experience ?? 0)} {t.directory.exp}</span>
                        </div>
                        {a.status === "pending" ? (
                          <div className="flex gap-2">
                            <button onClick={() => decide(a.id, "accepted")} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{t.dash.accept}</button>
                            <button onClick={() => decide(a.id, "rejected")} className="rounded-full border border-border px-3 py-1 text-xs">{t.dash.reject}</button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2 text-xs">
                            <span className={a.status === "accepted" ? "font-semibold text-primary" : "text-muted-foreground"}>{t.dash.status[a.status]}</span>
                            {a.status === "accepted" && phones[a.tutor_id] && <a href={`tel:${phones[a.tutor_id]}`} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"><Phone className="size-3" /> {phones[a.tutor_id]}</a>}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TutorView({ userId, num }: { userId: string; num: (n: number | string) => string }) {
  const { t } = useLang();
  const title = useTitle();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [apps, setApps] = useState<(App & { tuitions: T | null })[] | null>(null);
  const [contacts, setContacts] = useState<Record<number, { name: string; phone: string }>>({});

  useEffect(() => {
    const sb = supabase();
    sb.from("tutors").select("id").eq("id", userId).maybeSingle().then(({ data }) => setHasProfile(!!data));
    sb.from("applications").select(`id, status, tuition_id, tutor_id, tuitions(${TUITION_COLS})`).eq("tutor_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => setApps((data as unknown as (App & { tuitions: T | null })[]) ?? []));
    sb.from("tuition_contacts").select("tuition_id, name, phone")
      .then(({ data }) => setContacts(Object.fromEntries(((data as { tuition_id: number; name: string; phone: string }[]) ?? []).map((c) => [c.tuition_id, c]))));
  }, [userId]);

  return (
    <section className="space-y-8">
      {hasProfile === false && (
        <div className="rounded-2xl border border-dashed border-accent bg-accent/10 p-5">
          <p className="font-semibold">{t.dash.profileMissing}</p>
          <Link href="/become-tutor" className="mt-3 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{t.nav.become}</Link>
        </div>
      )}
      {hasProfile && <Link href="/become-tutor" className="inline-block rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">{t.dash.editProfile}</Link>}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t.dash.myApplications}</h2>
          <Link href="/tuitions" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">{t.nav.tuitions}</Link>
        </div>
        {apps === null ? <p className="mt-4 text-muted-foreground">{t.auth.wait}</p> : apps.length === 0 ? <p className="mt-4 text-muted-foreground">{t.dash.noApplications}</p> : (
          <ul className="mt-4 space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
                <div>
                  <p className="font-semibold">{a.tuitions ? title(a.tuitions) : `#${a.tuition_id}`}</p>
                  {a.tuitions && <p className="text-muted-foreground">{t.options.areas[a.tuitions.area]} · ৳{num(a.tuitions.salary)}{t.board.perMonth}</p>}
                </div>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === "accepted" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.dash.status[a.status]}</span>
                  {a.status === "accepted" && contacts[a.tuition_id] && (
                    <a href={`tel:${contacts[a.tuition_id].phone}`} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <Phone className="size-3" /> {contacts[a.tuition_id].name}: {contacts[a.tuition_id].phone}
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
