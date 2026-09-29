"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { isConfigured, supabase } from "@/lib/supabase";
import { TUITION_COLS } from "@/lib/data";

type Tu = { id: string; full_name: string; institution: string; verified: boolean; experience: number; created_at: string };
type Ti = { id: number; cls: number; subjects: number[]; area: number; salary: number; status: string; applicants_count: number };

export default function AdminPage() {
  const { t, num } = useLang();
  const { profile, loading } = useAuth();
  const [tutors, setTutors] = useState<Tu[]>([]);
  const [tuitions, setTuitions] = useState<Ti[]>([]);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    const sb = supabase();
    const [a, b, c] = await Promise.all([
      sb.from("tutors").select("id, full_name, institution, verified, experience, created_at").order("verified").order("created_at", { ascending: false }),
      sb.from("tuitions").select(TUITION_COLS).order("created_at", { ascending: false }).limit(100),
      sb.from("tutor_contacts").select("tutor_id, phone"),
    ]);
    setTutors((a.data as Tu[]) ?? []);
    setTuitions((b.data as Ti[]) ?? []);
    setPhones(Object.fromEntries(((c.data as { tutor_id: string; phone: string }[]) ?? []).map((r) => [r.tutor_id, r.phone])));
  }, []);

  useEffect(() => { if (isConfigured && isAdmin) load(); }, [isAdmin, load]);

  if (!isConfigured || loading || !isAdmin)
    return <div className="mx-auto max-w-4xl px-4 py-12"><h1 className="font-display text-4xl font-bold">{t.admin.title}</h1><p className="mt-4 text-muted-foreground">{loading ? t.auth.wait : t.admin.notAdmin}</p></div>;

  const sb = supabase();
  const verify = async (id: string, v: boolean) => { await sb.from("tutors").update({ verified: v }).eq("id", id); load(); };
  const setStatus = async (id: number, status: string) => { await sb.from("tuitions").update({ status }).eq("id", id); load(); };
  const remove = async (id: number) => { await sb.from("tuitions").delete().eq("id", id); load(); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t.admin.title}</h1>

      <h2 className="mt-8 text-xl font-bold">{t.admin.tutors} ({num(tutors.length)})</h2>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
        {tutors.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <div>
              <p className="flex items-center gap-1 font-semibold">{x.full_name}{x.verified && <BadgeCheck className="size-4 text-primary" />}</p>
              <p className="text-muted-foreground">{x.institution} · {num(x.experience)} {t.directory.exp} · {phones[x.id] ?? "—"}</p>
            </div>
            <button onClick={() => verify(x.id, !x.verified)} className={`rounded-full px-3 py-1 text-xs font-semibold ${x.verified ? "border border-border" : "bg-primary text-primary-foreground"}`}>
              {x.verified ? t.admin.unverify : t.admin.verify}
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-bold">{t.admin.tuitions} ({num(tuitions.length)})</h2>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
        {tuitions.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <div>
              <p className="font-semibold">#{num(x.id)} · {t.options.classes[x.cls]} — {x.subjects.map((s) => t.options.subjects[s]).join(", ")}</p>
              <p className="text-muted-foreground">{t.options.areas[x.area]} · ৳{num(x.salary)} · {num(x.applicants_count)} {t.board.applicants} · {x.status === "open" ? t.dash.open : t.dash.closed}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatus(x.id, x.status === "open" ? "closed" : "open")} className="rounded-full border border-border px-3 py-1 text-xs">{x.status === "open" ? t.dash.close : t.dash.open}</button>
              <button onClick={() => { if (window.confirm(t.admin.remove + "?")) remove(x.id); }} className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">{t.admin.remove}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
