"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Ban, Crown, Phone } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { isConfigured, supabase } from "@/lib/supabase";
import { TUITION_COLS } from "@/lib/data";

type User = { id: string; full_name: string; email: string | null; role: "guardian" | "tutor" | "admin"; is_super: boolean; blocked: boolean; created_at: string };
type Tu = { id: string; full_name: string; institution: string; verified: boolean; experience: number; created_at: string };
type Ti = { id: number; guardian_id: string; cls: number; subjects: number[]; area: number; salary: number; status: string; applicants_count: number; created_at: string };
type App = { id: number; tuition_id: number; tutor_id: string; status: "pending" | "accepted" | "rejected"; created_at: string };
type Tab = "overview" | "users" | "tutors" | "tuitions" | "applications";

export default function AdminPage() {
  const { t, num } = useLang();
  const { profile, loading } = useAuth();
  const a = t.admin;
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [tutors, setTutors] = useState<Tu[]>([]);
  const [tuitions, setTuitions] = useState<Ti[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [tutorPhones, setTutorPhones] = useState<Record<string, string>>({});
  const [guardianContacts, setGuardianContacts] = useState<Record<number, { name: string; phone: string }>>({});
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const isAdmin = profile?.role === "admin";
  const isSuper = !!profile?.is_super;

  const load = useCallback(async () => {
    const sb = supabase();
    const [u, tu, ti, ap, tp, gc] = await Promise.all([
      sb.from("profiles").select("id, full_name, email, role, is_super, blocked, created_at").order("created_at", { ascending: false }),
      sb.from("tutors").select("id, full_name, institution, verified, experience, created_at").order("verified").order("created_at", { ascending: false }),
      sb.from("tuitions").select(`${TUITION_COLS}, guardian_id`).order("created_at", { ascending: false }),
      sb.from("applications").select("id, tuition_id, tutor_id, status, created_at").order("created_at", { ascending: false }),
      sb.from("tutor_contacts").select("tutor_id, phone"),
      sb.from("tuition_contacts").select("tuition_id, name, phone"),
    ]);
    setUsers((u.data as User[]) ?? []);
    setTutors((tu.data as Tu[]) ?? []);
    setTuitions((ti.data as Ti[]) ?? []);
    setApps((ap.data as App[]) ?? []);
    setTutorPhones(Object.fromEntries(((tp.data as { tutor_id: string; phone: string }[]) ?? []).map((r) => [r.tutor_id, r.phone])));
    setGuardianContacts(Object.fromEntries(((gc.data as { tuition_id: number; name: string; phone: string }[]) ?? []).map((r) => [r.tuition_id, r])));
  }, []);

  useEffect(() => { if (isConfigured && isAdmin) load(); }, [isAdmin, load]);

  const names = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.full_name || u.email || "—"])), [users]);
  const filteredUsers = users.filter((u) => !q || `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  if (!isConfigured || loading || !isAdmin)
    return <div className="mx-auto max-w-5xl px-4 py-12"><h1 className="font-display text-4xl font-bold">{a.title}</h1><p className="mt-4 text-muted-foreground">{loading ? t.auth.wait : a.notAdmin}</p></div>;

  const sb = supabase();
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    setErr(error ? error.message : "");
    load();
  };
  const ask = (fn: () => void) => { if (window.confirm(a.confirm)) fn(); };
  const title = (x: { cls: number; subjects: number[] }) => `${t.options.classes[x.cls]} — ${x.subjects.map((s) => t.options.subjects[s]).join(", ")}`;
  const tuitionById = Object.fromEntries(tuitions.map((x) => [x.id, x]));

  const tabs: [Tab, string, number?][] = [
    ["overview", a.overview],
    ["users", a.users, users.length],
    ["tutors", a.tutors, tutors.length],
    ["tuitions", a.tuitions, tuitions.length],
    ["applications", a.applications, apps.length],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="flex flex-wrap items-center gap-3 font-display text-4xl font-bold">
        {a.title}
        {isSuper && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"><Crown className="size-4" /> {a.superAdmin}</span>}
      </h1>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"}`}>
            {label}{n !== undefined && ` (${num(n)})`}
          </button>
        ))}
      </div>
      {err && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{t.auth.error}: {err}</p>}

      {tab === "overview" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [a.totalUsers, users.length],
            [a.totalTutors, tutors.length],
            [a.pendingVerify, tutors.filter((x) => !x.verified).length],
            [a.totalTuitions, tuitions.length],
            [a.totalApps, apps.length],
          ].map(([label, n]) => (
            <div key={label as string} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-display text-3xl font-bold text-primary">{num(n as number)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.search} className="field mt-6 max-w-sm" />
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
            {filteredUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {u.full_name || "—"}
                    {u.is_super && <Crown className="size-4 text-accent" />}
                    {u.blocked && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600"><Ban className="size-3" /> {a.blocked}</span>}
                  </p>
                  <p className="truncate text-muted-foreground">{u.email}</p>
                </div>
                {isSuper && !u.is_super ? (
                  <div className="flex items-center gap-2">
                    <select value={u.role} onChange={(e) => run(sb.from("profiles").update({ role: e.target.value }).eq("id", u.id))} className="field w-auto py-1.5" aria-label={a.role}>
                      <option value="guardian">{t.auth.guardian}</option>
                      <option value="tutor">{t.auth.tutor}</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => ask(() => run(sb.from("profiles").update({ blocked: !u.blocked }).eq("id", u.id)))} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${u.blocked ? "border border-border" : "bg-red-600 text-white"}`}>
                      {u.blocked ? a.unblock : a.block}
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{u.is_super ? a.superAdmin : u.role}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "tutors" && (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {tutors.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <Link href={`/tutor?id=${x.id}`} className="flex items-center gap-1 font-semibold hover:text-primary">{x.full_name}{x.verified && <BadgeCheck className="size-4 text-primary" />}</Link>
                <p className="text-muted-foreground">{x.institution} · {num(x.experience)} {t.directory.exp}</p>
                {tutorPhones[x.id] && <a href={`tel:${tutorPhones[x.id]}`} className="mt-1 inline-flex items-center gap-1 text-primary"><Phone className="size-3" /> {tutorPhones[x.id]}</a>}
              </div>
              <div className="flex gap-2">
                <Link href={`/tutor?id=${x.id}`} className="rounded-full border border-border px-3 py-1.5 text-xs">{a.view}</Link>
                <button onClick={() => run(sb.from("tutors").update({ verified: !x.verified }).eq("id", x.id))} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${x.verified ? "border border-border" : "bg-primary text-primary-foreground"}`}>
                  {x.verified ? a.unverify : a.verify}
                </button>
                <button onClick={() => ask(() => run(sb.from("tutors").delete().eq("id", x.id)))} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{a.remove}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "tuitions" && (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {tuitions.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold">#{num(x.id)} · {title(x)}</p>
                <p className="text-muted-foreground">{t.options.areas[x.area]} · ৳{num(x.salary)} · {num(x.applicants_count)} {t.board.applicants} · {x.status === "open" ? t.dash.open : t.dash.closed}</p>
                {guardianContacts[x.id] && (
                  <p className="mt-1 text-xs">{a.guardianContact}: <span className="font-semibold">{guardianContacts[x.id].name}</span> · <a href={`tel:${guardianContacts[x.id].phone}`} className="text-primary">{guardianContacts[x.id].phone}</a> · {names[x.guardian_id]}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => run(sb.from("tuitions").update({ status: x.status === "open" ? "closed" : "open" }).eq("id", x.id))} className="rounded-full border border-border px-3 py-1.5 text-xs">{x.status === "open" ? t.dash.close : t.dash.open}</button>
                <button onClick={() => ask(() => run(sb.from("tuitions").delete().eq("id", x.id)))} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{a.remove}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "applications" && (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {apps.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold"><Link href={`/tutor?id=${x.tutor_id}`} className="hover:text-primary">{names[x.tutor_id]}</Link> → #{num(x.tuition_id)} {tuitionById[x.tuition_id] ? title(tuitionById[x.tuition_id]) : ""}</p>
                <p className="text-muted-foreground">{t.dash.status[x.status]}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={x.status} onChange={(e) => run(sb.from("applications").update({ status: e.target.value }).eq("id", x.id))} className="field w-auto py-1.5">
                  {(["pending", "accepted", "rejected"] as const).map((s) => <option key={s} value={s}>{t.dash.status[s]}</option>)}
                </select>
                <button onClick={() => ask(() => run(sb.from("applications").delete().eq("id", x.id)))} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">{a.remove}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
