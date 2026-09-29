"use client";

import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { Chips, Field, FormShell, nums } from "@/components/FormBits";
import { supabase } from "@/lib/supabase";

export default function PostTuitionPage() {
  const { t, num } = useLang();
  const { user } = useAuth();
  const f = t.postForm;
  const o = t.options;

  const save = async (fd: FormData) => {
    if (!user) return t.auth.needLogin;
    const sb = supabase();
    const { data, error } = await sb
      .from("tuitions")
      .insert({
        guardian_id: user.id,
        cls: Number(fd.get("cls")),
        subjects: nums(fd, "subjects"),
        medium: Number(fd.get("medium")),
        area: Number(fd.get("area")),
        address: String(fd.get("address") || "") || null,
        days: Number(fd.get("days")),
        salary: Number(fd.get("salary")),
        gender: Number(fd.get("gender")),
        note: String(fd.get("note") || "") || null,
      })
      .select("id")
      .single();
    if (error) return error.message;
    const c = await sb.from("tuition_contacts").insert({ tuition_id: data.id, name: String(fd.get("name")), phone: String(fd.get("phone")) });
    return c.error ? c.error.message : null;
  };

  return (
    <FormShell title={f.title} desc={f.desc} submit={f.submit} role="guardian" gateText={t.auth.needGuardian} onSubmit={save}>
      <Field label={f.studentClass}>
        <select name="cls" className="field" required defaultValue="">
          <option value="" disabled>—</option>
          {o.classes.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.medium}>
        <select name="medium" className="field" defaultValue="0">
          {o.mediums.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.subjects} full>
        <Chips name="subjects" options={o.subjects} />
      </Field>
      <Field label={f.area}>
        <select name="area" className="field" required defaultValue="">
          <option value="" disabled>—</option>
          {o.areas.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.address}>
        <input name="address" className="field" />
      </Field>
      <Field label={f.days}>
        <select name="days" className="field" defaultValue="3">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{num(d)}</option>)}
        </select>
      </Field>
      <Field label={f.salary}>
        <input name="salary" className="field" type="number" min={500} step={500} placeholder="5000" required />
      </Field>
      <Field label={f.gender} full>
        <div className="flex flex-wrap gap-4 text-sm">
          {o.genders.map((g, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="gender" value={i} defaultChecked={i === 0} className="accent-[var(--primary)]" /> {g}
            </label>
          ))}
        </div>
      </Field>
      <Field label={f.note} full>
        <textarea name="note" className="field min-h-24" />
      </Field>
      <Field label={f.name}>
        <input name="name" className="field" required />
      </Field>
      <Field label={f.phone}>
        <input name="phone" className="field" type="tel" inputMode="tel" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" required />
      </Field>
    </FormShell>
  );
}
