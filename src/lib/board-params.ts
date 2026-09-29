/**
 * Job-board URL <-> filter mapping, shared by the Server Component (parsing) and the client filter panel (writing).
 *
 * URLs use short lowercase slugs so they are readable and shareable:
 *   /tuitions?city=dhaka&area=mirpur&medium=english-medium&curriculum=english-medium-edexcel&grade=o-level&page=2
 * Parsing is case-insensitive, validates every code against the catalog and drops broken chains
 * (an area that isn't in the chosen city, a class that doesn't exist in the chosen medium, …).
 */
import { GRADES, MEDIUMS, SUBJECTS, TUITION_TYPES, isArea, isCity, mediumOfCurriculum } from "./catalog";

export type BoardParams = {
  q?: string;
  city?: string;
  area?: string;
  online?: boolean;
  medium?: string;
  curriculum?: string;
  grade?: string;
  subject?: string;
  type?: string;
  tgender?: "MALE" | "FEMALE";
  min?: number;
  max?: number;
  sort?: "salary";
  page?: number;
};

type SP = URLSearchParams | Record<string, string | string[] | undefined>;
const get = (sp: SP, k: string) => {
  const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
};
const code = (v?: string) => v?.toUpperCase().replace(/-/g, "_");
const slug = (v: string) => v.toLowerCase().replace(/_/g, "-");
const int = (v?: string) => (v && /^\d{1,7}$/.test(v) ? Number(v) : undefined);

export function parseBoardParams(sp: SP): BoardParams {
  const p: BoardParams = {};
  const q = get(sp, "q"); if (q) p.q = q.slice(0, 80);

  if (get(sp, "online") === "1") p.online = true;
  else {
    const city = code(get(sp, "city"));
    if (city && isCity(city)) {
      p.city = city;
      const area = code(get(sp, "area"));
      if (area && isArea(city, area)) p.area = area;
    }
  }

  const curriculum = code(get(sp, "curriculum"));
  let medium = MEDIUMS.find((m) => m.code === code(get(sp, "medium")));
  if (curriculum && mediumOfCurriculum(curriculum)) {
    const own = mediumOfCurriculum(curriculum)!;
    if (!medium || medium.code === own.code) { medium = own; p.curriculum = curriculum; }
  }
  if (medium) p.medium = medium.code;
  const grade = code(get(sp, "grade"));
  if (grade && GRADES.some((g) => g.code === grade) && (!medium || medium.grades.includes(grade))) p.grade = grade;

  const subject = code(get(sp, "subject"));
  if (subject && subject !== "ALL" && SUBJECTS.some((s) => s.code === subject)) p.subject = subject;
  const type = code(get(sp, "type"));
  if (type && type in TUITION_TYPES) p.type = type;
  const tg = code(get(sp, "tgender"));
  if (tg === "MALE" || tg === "FEMALE") p.tgender = tg;

  p.min = int(get(sp, "min"));
  p.max = int(get(sp, "max"));
  if (p.min && p.max && p.min > p.max) [p.min, p.max] = [p.max, p.min];
  if (get(sp, "sort") === "salary") p.sort = "salary";
  const page = int(get(sp, "page"));
  if (page && page > 1) p.page = Math.min(page, 10_000);
  for (const k of Object.keys(p) as (keyof BoardParams)[]) if (p[k] === undefined) delete p[k];
  return p;
}

/** Canonical query string for a filter set (stable key order → one URL per filter combination). */
export function toBoardQuery(p: BoardParams): string {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.online) q.set("online", "1");
  else {
    if (p.city) q.set("city", slug(p.city));
    if (p.city && p.area) q.set("area", slug(p.area));
  }
  if (p.medium) q.set("medium", slug(p.medium));
  if (p.curriculum) q.set("curriculum", slug(p.curriculum));
  if (p.grade) q.set("grade", slug(p.grade));
  if (p.subject) q.set("subject", slug(p.subject));
  if (p.type) q.set("type", slug(p.type));
  if (p.tgender) q.set("tgender", p.tgender.toLowerCase());
  if (p.min) q.set("min", String(p.min));
  if (p.max) q.set("max", String(p.max));
  if (p.sort) q.set("sort", p.sort);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  return q.toString();
}

export const boardHref = (p: BoardParams) => { const s = toBoardQuery(p); return s ? `/tuitions?${s}` : "/tuitions"; };

/** Curricula the DB query should match for the chosen medium / board. */
export function curriculaFor(p: BoardParams): string[] | undefined {
  if (p.curriculum) return [p.curriculum];
  return MEDIUMS.find((m) => m.code === p.medium)?.curricula;
}

