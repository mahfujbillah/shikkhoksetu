"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { CITIES, CURRICULA, GRADES, MEDIUMS, SUBJECTS, TUITION_TYPES } from "@/lib/catalog";
import { boardHref, parseBoardParams, type BoardParams } from "@/lib/board-params";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useT } from "./LanguageProvider";

/**
 * Hierarchical, URL-driven filters.
 *   City → Area          (area list depends on the city; changing city clears the area)
 *   Medium → Board → Class (English Medium → Cambridge / Edexcel / IB; class list depends on the medium)
 * Every change pushes a canonical, shareable URL (e.g. /tuitions?city=dhaka&area=mirpur) and resets to page 1;
 * the Server Component re-queries. Back/forward re-seeds this panel from the URL.
 */
export function BoardFilters() {
  const sp = useSearchParams();
  // Lives outside the keyed panel so the phone toggle stays open while filters change.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Re-mount on URL change so local state always mirrors the address bar.
  return <FiltersPanel key={sp.toString()} initial={parseBoardParams(sp)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />;
}

function FiltersPanel({ initial, mobileOpen, setMobileOpen }: { initial: BoardParams; mobileOpen: boolean; setMobileOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [f, setF] = useState<BoardParams>(initial);
  const [pending, start] = useTransition();
  const activeCount = Object.keys(initial).filter((k) => k !== "page" && k !== "sort").length;

  const push = (next: BoardParams) => {
    const clean = { ...next, page: undefined };
    setF(clean);
    start(() => router.push(boardHref(clean), { scroll: false }));
  };
  const set = (patch: Partial<BoardParams>) => push({ ...f, ...patch });

  const medium = MEDIUMS.find((m) => m.code === f.medium);
  const city = CITIES.find((c) => c.code === f.city);
  const boards = medium && medium.curricula.length > 1 ? medium.curricula : [];
  const grades = medium ? GRADES.filter((g) => medium.grades.includes(g.code)) : GRADES;

  const select = (id: string, label: string, value: string | undefined, onChange: (v: string | undefined) => void, opts: { value: string; label: string }[], all: string, disabled?: boolean) => (
    <div>
      <Label htmlFor={`f-${id}`} className="text-xs text-muted-foreground">{label}</Label>
      <Select id={`f-${id}`} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{all}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </div>
  );

  const commitNumber = (k: "min" | "max", raw: string) => {
    const n = /^\d{1,7}$/.test(raw.trim()) ? Number(raw.trim()) : undefined;
    if (n !== f[k]) set({ [k]: n });
  };

  return (
    <>
    {/* Phones: filters collapse behind a toggle so results stay above the fold */}
    <button type="button" onClick={() => setMobileOpen((o) => !o)} aria-expanded={mobileOpen} aria-controls="board-filters"
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold lg:hidden">
      <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" /> {t("ফিল্টার", "Filters")}{activeCount > 0 && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span>}</span>
      <span className="text-muted-foreground">{mobileOpen ? "▲" : "▼"}</span>
    </button>
    <form id="board-filters" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); set({ q: typeof q === "string" && q.trim() ? q.trim().slice(0, 80) : undefined }); }}
      className={`mt-3 space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:mt-0 lg:block ${mobileOpen ? "block" : "hidden"}`} aria-busy={pending}>
      <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4" /> {t("ফিল্টার", "Filters")} {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}</h2>
      <Input name="q" defaultValue={f.q ?? ""} placeholder={t("কীওয়ার্ড বা জব আইডি…", "Keyword or Job ID…")} aria-label={t("খুঁজুন", "Search")} />

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("লোকেশন", "Location")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.online} onChange={(e) => set({ online: e.target.checked || undefined, city: undefined, area: undefined })} className="size-4 accent-[var(--primary)]" /> {t("শুধু অনলাইন টিউশন", "Online tuitions only")}
        </label>
        {select("city", t("শহর", "City"), f.city, (v) => set({ city: v, area: undefined }), CITIES.map((c) => ({ value: c.code, label: c[lang] })), t("সব শহর", "All cities"), f.online)}
        {select("area", t("এলাকা", "Area"), f.area, (v) => set({ area: v }), (city?.areas ?? []).map((a) => ({ value: a.code, label: a[lang] })), city ? t(`${city[lang]}-এর সব এলাকা`, `All areas in ${city.en}`) : t("আগে শহর বাছুন", "Choose a city first"), f.online || !city)}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("মাধ্যম ও শ্রেণি", "Medium & class")}</legend>
        {select("medium", t("মাধ্যম", "Medium"), f.medium, (v) => {
          const m = MEDIUMS.find((x) => x.code === v);
          set({ medium: v, curriculum: undefined, grade: m && f.grade && !m.grades.includes(f.grade) ? undefined : f.grade });
        }, MEDIUMS.map((m) => ({ value: m.code, label: m[lang] })), t("সব মাধ্যম", "All mediums"))}
        {boards.length > 0 && select("curriculum", t("কারিকুলাম / বোর্ড", "Curriculum / board"), f.curriculum, (v) => set({ curriculum: v }), boards.map((c) => ({ value: c, label: CURRICULA[c][lang] })), t("সব বোর্ড", "All boards"))}
        {select("grade", t("শ্রেণি", "Class"), f.grade, (v) => set({ grade: v }), grades.map((g) => ({ value: g.code, label: g[lang] })), t("সব শ্রেণি", "All classes"))}
        {select("subject", t("বিষয়", "Subject"), f.subject, (v) => set({ subject: v }), SUBJECTS.filter((s) => s.code !== "ALL").map((s) => ({ value: s.code, label: s[lang] })), t("সব বিষয়", "All subjects"))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("অন্যান্য", "More")}</legend>
        {select("type", t("টিউশনের ধরন", "Tuition type"), f.type, (v) => set({ type: v }), Object.entries(TUITION_TYPES).map(([k, v]) => ({ value: k, label: v[lang] })), t("হোম ও অনলাইন সব", "Home & online"))}
        {select("tgender", t("শিক্ষকের লিঙ্গ", "Tutor gender"), f.tgender, (v) => set({ tgender: v as BoardParams["tgender"] }), [{ value: "MALE", label: t("পুরুষ শিক্ষক চলবে", "Open to male tutors") }, { value: "FEMALE", label: t("নারী শিক্ষক চলবে", "Open to female tutors") }], t("যেকোনো", "Any"))}
        <div>
          <Label className="text-xs text-muted-foreground">{t("মাসিক সম্মানী (৳)", "Monthly salary (৳)")}</Label>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} step={500} inputMode="numeric" defaultValue={f.min ?? ""} placeholder={t("সর্বনিম্ন", "Min")} aria-label={t("সর্বনিম্ন সম্মানী", "Minimum salary")} onBlur={(e) => commitNumber("min", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitNumber("min", e.currentTarget.value); } }} />
            <span className="text-muted-foreground">–</span>
            <Input type="number" min={0} step={500} inputMode="numeric" defaultValue={f.max ?? ""} placeholder={t("সর্বোচ্চ", "Max")} aria-label={t("সর্বোচ্চ সম্মানী", "Maximum salary")} onBlur={(e) => commitNumber("max", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitNumber("max", e.currentTarget.value); } }} />
          </div>
        </div>
        {select("sort", t("সাজান", "Sort"), f.sort, (v) => set({ sort: v === "salary" ? "salary" : undefined }), [{ value: "salary", label: t("বেশি সম্মানী আগে", "Highest salary") }], t("নতুন আগে", "Newest first"))}
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">{t("খুঁজুন", "Search")}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => push({})}><RotateCcw /> {t("মুছুন", "Reset")}</Button>
      </div>
    </form>
    </>
  );
}
