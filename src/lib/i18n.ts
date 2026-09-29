/**
 * Tiny bilingual helper. Instead of a giant dictionary we write both strings at the call site:
 *   t("টিউশন খুঁজুন", "Find tuitions")
 * The active language comes from the `lang` cookie (server: getT()) or LangProvider (client: useT()).
 */
export type Lang = "bn" | "en";
export type T = (bn: string, en: string) => string;

export const makeT = (lang: Lang): T => (bn, en) => (lang === "bn" ? bn : en);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export function formatNumber(n: number | string, lang: Lang) {
  const s = typeof n === "number" ? n.toLocaleString("en-IN") : n;
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[+d]) : s;
}
export function formatMoney(n: number | string | { toString(): string }, lang: Lang) {
  const v = Math.round(Number(n.toString()));
  return `৳${formatNumber(v, lang)}`;
}
export function formatDate(d: Date | string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", ...opts }).format(new Date(d));
}
export function timeAgo(d: Date | string, lang: Lang) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  const t = makeT(lang);
  if (mins < 60) return t(`${formatNumber(mins, lang)} মিনিট আগে`, `${mins}m ago`);
  const h = Math.round(mins / 60);
  if (h < 24) return t(`${formatNumber(h, lang)} ঘণ্টা আগে`, `${h}h ago`);
  const days = Math.round(h / 24);
  return t(`${formatNumber(days, lang)} দিন আগে`, `${days}d ago`);
}
