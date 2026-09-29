"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { useAuth } from "@/components/AuthProvider";
import { Chips, Field, FormShell, nums } from "@/components/FormBits";
import { isConfigured, supabase } from "@/lib/supabase";

type Existing = {
  full_name: string; gender: number; institution: string; degree: string | null; subjects: number[]; classes: number[];
  areas: number[]; experience: number; salary: number | null; bio: string | null; phone?: string; email?: string | null;
};

export default function BecomeTutorPage() {
  const { t } = useLang();
  const { user, profile } = useAuth();
  const f = t.tutorForm;
  const o = t.options;
  const [ex, setEx] = useState<Existing | null>(null);

  // Prefill when a tutor edits their profile
  useEffect(() => {
    if (!isConfigured || !user) return;
    const sb = supabase();
    Promise.all([
      sb.from("tutors").select("full_name, gender, institution, degree, subjects, classes, areas, experience, salary, bio").eq("id", user.id).maybeSingle(),
      sb.from("tutor_contacts").select("phone, email").eq("tutor_id", user.id).maybeSingle(),
    ]).then(([a, b]) => {
      if (a.data) setEx({ ...(a.data as Existing), ...(b.data ?? {}) });
      else setEx({ full_name: profile?.full_name ?? "", gender: 0, institution: "", degree: null, subjects: [], classes: [], areas: [], experience: 0, salary: null, bio: null, email: user.email });
    });
  }, [user, profile]);

  const save = async (fd: FormData) => {
    if (!user) return t.auth.needLogin;
    const sb = supabase();
    const { error } = await sb.from("tutors").upsert({
      id: user.id,
      full_name: String(fd.get("full_name")),
      gender: Number(fd.get("gender")),
      institution: String(fd.get("institution")),
      degree: String(fd.get("degree") || "") || null,
      subjects: nums(fd, "subjects"),
      classes: nums(fd, "classes"),
      areas: nums(fd, "areas"),
      experience: Number(fd.get("experience") || 0),
      salary: fd.get("salary") ? Number(fd.get("salary")) : null,
      bio: String(fd.get("bio") || "") || null,
    });
    if (error) return error.message;
    const c = await sb.from("tutor_contacts").upsert({ tutor_id: user.id, phone: String(fd.get("phone")), email: String(fd.get("email") || "") || null });
    return c.error ? c.error.message : null;
  };

  const k = ex ? "loaded" : "empty"; // remount inputs once existing data arrives

  return (
    <FormShell title={f.title} desc={f.desc} submit={f.submit} role="tutor" gateText={t.auth.needTutor} onSubmit={save}>
      <Field label={f.name}>
        <input key={k + "n"} name="full_name" className="field" required defaultValue={ex?.full_name} />
      </Field>
      <Field label={f.gender}>
        <select key={k + "g"} name="gender" className="field" required defaultValue={ex?.gender ? String(ex.gender) : ""}>
          <option value="" disabled>—</option>
          {o.genders.slice(1).map((g, i) => <option key={i} value={i + 1}>{g}</option>)}
        </select>
      </Field>
      <Field label={f.phone}>
        <input key={k + "p"} name="phone" className="field" type="tel" inputMode="tel" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" required defaultValue={ex?.phone} />
      </Field>
      <Field label={f.email}>
        <input key={k + "e"} name="email" className="field" type="email" defaultValue={ex?.email ?? ""} />
      </Field>
      <Field label={f.institution}>
        <input key={k + "i"} name="institution" className="field" required defaultValue={ex?.institution} />
      </Field>
      <Field label={f.degree}>
        <input key={k + "d"} name="degree" className="field" defaultValue={ex?.degree ?? ""} />
      </Field>
      <Field label={f.subjects} full>
        <Chips name="subjects" options={o.subjects.slice(1)} offset={1} initial={ex?.subjects ?? []} />
      </Field>
      <Field label={f.classes} full>
        <Chips name="classes" options={o.classes} initial={ex?.classes ?? []} />
      </Field>
      <Field label={f.areas} full>
        <Chips name="areas" options={o.areas} initial={ex?.areas ?? []} />
      </Field>
      <Field label={f.experience}>
        <input key={k + "x"} name="experience" className="field" type="number" min={0} max={40} placeholder="2" defaultValue={ex?.experience || ""} />
      </Field>
      <Field label={f.salary}>
        <input key={k + "s"} name="salary" className="field" type="number" min={500} step={500} placeholder="5000" defaultValue={ex?.salary ?? ""} />
      </Field>
      <Field label={f.bio} full>
        <textarea key={k + "b"} name="bio" className="field min-h-28" defaultValue={ex?.bio ?? ""} />
      </Field>
    </FormShell>
  );
}
