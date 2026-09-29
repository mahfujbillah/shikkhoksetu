"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { CITIES, CURRICULA, GRADES, SUBJECTS, TUITION_TYPES } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useT } from "./LanguageProvider";

/** URL-driven filters: every change updates the query string, the Server Component re-queries. */
export function BoardFilters() {
  const { t, lang } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const city = sp.get("city") ?? "";
  const online = sp.get("online") === "1";

  const apply = () => {
    const fd = new FormData(form.current!);
    const q = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim() !== "") q.set(k, v.trim());
    if (q.get("online") === "1") { q.delete("city"); q.delete("area"); }
    start(() => router.push(`/tuitions${q.size ? `?${q}` : ""}`, { scroll: false }));
  };

  const areas = CITIES.find((c) => c.code === city)?.areas ?? [];
  const sel = (name: string, label: string, opts: { value: string; label: string }[], all: string, disabled?: boolean) => (
    <div>
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Select id={name} name={name} defaultValue={sp.get(name) ?? ""} onChange={apply} disabled={disabled}>
        <option value="">{all}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </div>
  );

  return (
    <form ref={form} key={sp.toString()} onSubmit={(e) => { e.preventDefault(); apply(); }} className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4" /> {t("ফিল্টার", "Filters")} {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}</h2>
      <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder={t("কীওয়ার্ড খুঁজুন…", "Search keywords…")} />
      {sel("subject", t("বিষয়", "Subject"), SUBJECTS.filter((s) => s.code !== "ALL").map((s) => ({ value: s.code, label: s[lang] })), t("সব বিষয়", "All subjects"))}
      {sel("curriculum", t("মাধ্যম / কারিকুলাম", "Medium / Curriculum"), Object.entries(CURRICULA).map(([k, v]) => ({ value: k, label: v[lang] })), t("সব মাধ্যম", "All curricula"))}
      {sel("grade", t("শ্রেণি", "Class"), GRADES.map((g) => ({ value: g.code, label: g[lang] })), t("সব শ্রেণি", "All classes"))}
      {sel("type", t("টিউশনের ধরন", "Tutoring type"), Object.entries(TUITION_TYPES).map(([k, v]) => ({ value: k, label: v[lang] })), t("সব ধরন", "All types"))}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="online" value="1" defaultChecked={online} onChange={apply} className="size-4 accent-[var(--primary)]" /> {t("শুধু অনলাইন", "Online only")}
      </label>
      {sel("city", t("শহর", "City"), CITIES.map((c) => ({ value: c.code, label: c[lang] })), t("সব শহর", "All cities"), online)}
      {city && !online && sel("area", t("এলাকা", "Area"), areas.map((a) => ({ value: a.code, label: a[lang] })), t("সব এলাকা", "All areas"))}

      <div>
        <Label className="text-xs text-muted-foreground">{t("মাসিক সম্মানী (৳)", "Monthly salary (৳)")}</Label>
        <div className="flex items-center gap-2">
          <Input name="min" type="number" min={0} step={500} inputMode="numeric" defaultValue={sp.get("min") ?? ""} placeholder={t("সর্বনিম্ন", "Min")} onBlur={apply} />
          <span className="text-muted-foreground">–</span>
          <Input name="max" type="number" min={0} step={500} inputMode="numeric" defaultValue={sp.get("max") ?? ""} placeholder={t("সর্বোচ্চ", "Max")} onBlur={apply} />
        </div>
      </div>
      {sel("sort", t("সাজান", "Sort"), [{ value: "salary", label: t("বেশি সম্মানী আগে", "Highest salary") }], t("নতুন আগে", "Newest first"))}

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">{t("খুঁজুন", "Apply")}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => start(() => router.push("/tuitions"))}><RotateCcw /> {t("মুছুন", "Reset")}</Button>
      </div>
    </form>
  );
}
