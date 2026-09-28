"use client";

import { useLang } from "@/components/LanguageProvider";
import { Chips, Field, FormShell } from "@/components/FormBits";

export default function PostTuitionPage() {
  const { t, num } = useLang();
  const f = t.postForm;
  const o = t.options;

  return (
    <FormShell title={f.title} desc={f.desc} submit={f.submit}>
      <Field label={f.studentClass}>
        <select className="field" required defaultValue="">
          <option value="" disabled>—</option>
          {o.classes.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.medium}>
        <select className="field" defaultValue="0">
          {o.mediums.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.subjects} full>
        <Chips options={o.subjects} />
      </Field>
      <Field label={f.area}>
        <select className="field" required defaultValue="">
          <option value="" disabled>—</option>
          {o.areas.map((c, i) => <option key={i} value={i}>{c}</option>)}
        </select>
      </Field>
      <Field label={f.address}>
        <input className="field" />
      </Field>
      <Field label={f.days}>
        <select className="field" defaultValue="3">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{num(d)}</option>)}
        </select>
      </Field>
      <Field label={f.salary}>
        <input className="field" type="number" min={500} step={500} placeholder="5000" required />
      </Field>
      <Field label={f.gender} full>
        <div className="flex flex-wrap gap-4 text-sm">
          {o.genders.map((g, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name="gender" defaultChecked={i === 0} className="accent-[var(--primary)]" /> {g}
            </label>
          ))}
        </div>
      </Field>
      <Field label={f.note} full>
        <textarea className="field min-h-24" />
      </Field>
      <Field label={f.name}>
        <input className="field" required />
      </Field>
      <Field label={f.phone}>
        <input className="field" type="tel" inputMode="tel" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" required />
      </Field>
    </FormShell>
  );
}
