"use client";

import { useLang } from "@/components/LanguageProvider";
import { Chips, Field, FormShell } from "@/components/FormBits";

export default function BecomeTutorPage() {
  const { t } = useLang();
  const f = t.tutorForm;
  const o = t.options;

  return (
    <FormShell title={f.title} desc={f.desc} submit={f.submit}>
      <Field label={f.name}>
        <input className="field" required />
      </Field>
      <Field label={f.gender}>
        <select className="field" required defaultValue="">
          <option value="" disabled>—</option>
          {o.genders.slice(1).map((g, i) => <option key={i} value={i + 1}>{g}</option>)}
        </select>
      </Field>
      <Field label={f.phone}>
        <input className="field" type="tel" inputMode="tel" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" required />
      </Field>
      <Field label={f.email}>
        <input className="field" type="email" />
      </Field>
      <Field label={f.institution}>
        <input className="field" required />
      </Field>
      <Field label={f.degree}>
        <input className="field" />
      </Field>
      <Field label={f.subjects} full>
        <Chips options={o.subjects.slice(1)} />
      </Field>
      <Field label={f.classes} full>
        <Chips options={o.classes} />
      </Field>
      <Field label={f.areas} full>
        <Chips options={o.areas} />
      </Field>
      <Field label={f.experience}>
        <input className="field" type="number" min={0} max={40} placeholder="2" />
      </Field>
      <Field label={f.salary}>
        <input className="field" type="number" min={500} step={500} placeholder="5000" />
      </Field>
      <Field label={f.bio} full>
        <textarea className="field min-h-28" />
      </Field>
    </FormShell>
  );
}
