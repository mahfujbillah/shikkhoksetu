/**
 * Marketplace catalog — the single source of truth for grades, subjects and locations.
 * Stored in the DB as stable string codes; labels are bilingual (bn / en).
 * Add new items freely; never rename an existing code (existing rows reference it).
 */

export type Bi = { bn: string; en: string };
type Item = { code: string } & Bi;

export const GRADES: Item[] = [
  { code: "PRE_SCHOOL", bn: "প্লে–নার্সারি–কেজি", en: "Play – Nursery – KG" },
  { code: "CLASS_1_5", bn: "১ম–৫ম শ্রেণি", en: "Class 1–5" },
  { code: "CLASS_6_8", bn: "৬ষ্ঠ–৮ম শ্রেণি", en: "Class 6–8" },
  { code: "SSC", bn: "SSC (৯ম–১০ম)", en: "SSC (Class 9–10)" },
  { code: "HSC", bn: "HSC (একাদশ–দ্বাদশ)", en: "HSC (Class 11–12)" },
  { code: "O_LEVEL", bn: "O Level", en: "O Level" },
  { code: "A_LEVEL", bn: "A Level", en: "A Level" },
  { code: "ADMISSION", bn: "ভর্তি প্রস্তুতি", en: "Admission prep" },
  { code: "QURAN_ARABIC", bn: "কুরআন / আরবি", en: "Quran / Arabic" },
  { code: "UNIVERSITY", bn: "বিশ্ববিদ্যালয়", en: "University" },
  { code: "SKILLS", bn: "দক্ষতা (IELTS, প্রোগ্রামিং…)", en: "Skills (IELTS, coding…)" },
];

export const SUBJECTS: Item[] = [
  { code: "ALL", bn: "সব বিষয়", en: "All subjects" },
  { code: "MATH", bn: "গণিত", en: "Mathematics" },
  { code: "HIGHER_MATH", bn: "উচ্চতর গণিত", en: "Higher Math" },
  { code: "ENGLISH", bn: "ইংরেজি", en: "English" },
  { code: "BANGLA", bn: "বাংলা", en: "Bangla" },
  { code: "PHYSICS", bn: "পদার্থবিজ্ঞান", en: "Physics" },
  { code: "CHEMISTRY", bn: "রসায়ন", en: "Chemistry" },
  { code: "BIOLOGY", bn: "জীববিজ্ঞান", en: "Biology" },
  { code: "GENERAL_SCIENCE", bn: "সাধারণ বিজ্ঞান", en: "General Science" },
  { code: "ICT", bn: "ICT", en: "ICT" },
  { code: "ACCOUNTING", bn: "হিসাববিজ্ঞান", en: "Accounting" },
  { code: "FINANCE", bn: "ফিন্যান্স", en: "Finance" },
  { code: "ECONOMICS", bn: "অর্থনীতি", en: "Economics" },
  { code: "BUSINESS", bn: "ব্যবসায় শিক্ষা", en: "Business Studies" },
  { code: "BGS", bn: "বাংলাদেশ ও বিশ্বপরিচয়", en: "Bangladesh & Global Studies" },
  { code: "RELIGION", bn: "ধর্ম", en: "Religion" },
  { code: "QURAN", bn: "কুরআন তিলাওয়াত", en: "Quran recitation" },
  { code: "ARABIC", bn: "আরবি", en: "Arabic" },
  { code: "IELTS", bn: "IELTS", en: "IELTS" },
  { code: "PROGRAMMING", bn: "প্রোগ্রামিং", en: "Programming" },
];

export const CITIES: (Item & { areas: Item[] })[] = [
  {
    code: "DHAKA", bn: "ঢাকা", en: "Dhaka",
    areas: [
      ["MIRPUR", "মিরপুর", "Mirpur"], ["UTTARA", "উত্তরা", "Uttara"], ["DHANMONDI", "ধানমন্ডি", "Dhanmondi"],
      ["MOHAMMADPUR", "মোহাম্মদপুর", "Mohammadpur"], ["BADDA", "বাড্ডা", "Badda"], ["KHILKHET", "খিলক্ষেত", "Khilkhet"],
      ["BASHUNDHARA", "বসুন্ধরা", "Bashundhara"], ["JATRABARI", "যাত্রাবাড়ী", "Jatrabari"], ["GULSHAN", "গুলশান", "Gulshan"],
      ["BANANI", "বনানী", "Banani"], ["MOTIJHEEL", "মতিঝিল", "Motijheel"], ["RAMPURA", "রামপুরা", "Rampura"],
      ["MALIBAGH", "মালিবাগ", "Malibagh"], ["LALBAGH", "লালবাগ", "Lalbagh"], ["TEJGAON", "তেজগাঁও", "Tejgaon"],
    ].map(([code, bn, en]) => ({ code, bn, en })),
  },
  {
    code: "GAZIPUR", bn: "গাজীপুর", en: "Gazipur",
    areas: [["TONGI", "টঙ্গী", "Tongi"], ["BOARD_BAZAR", "বোর্ড বাজার", "Board Bazar"], ["GAZIPUR_SADAR", "সদর", "Sadar"]].map(([code, bn, en]) => ({ code, bn, en })),
  },
  {
    code: "CHATTOGRAM", bn: "চট্টগ্রাম", en: "Chattogram",
    areas: [["AGRABAD", "আগ্রাবাদ", "Agrabad"], ["NASIRABAD", "নাসিরাবাদ", "Nasirabad"], ["HALISHAHAR", "হালিশহর", "Halishahar"], ["PANCHLAISH", "পাঁচলাইশ", "Panchlaish"]].map(([code, bn, en]) => ({ code, bn, en })),
  },
  {
    code: "SYLHET", bn: "সিলেট", en: "Sylhet",
    areas: [["ZINDABAZAR", "জিন্দাবাজার", "Zindabazar"], ["AMBARKHANA", "আম্বরখানা", "Ambarkhana"]].map(([code, bn, en]) => ({ code, bn, en })),
  },
  {
    code: "RAJSHAHI", bn: "রাজশাহী", en: "Rajshahi",
    areas: [["SHAHEB_BAZAR", "সাহেব বাজার", "Shaheb Bazar"], ["UPASHAHAR", "উপশহর", "Upashahar"]].map(([code, bn, en]) => ({ code, bn, en })),
  },
  {
    code: "KHULNA", bn: "খুলনা", en: "Khulna",
    areas: [["SONADANGA", "সোনাডাঙ্গা", "Sonadanga"], ["KHALISHPUR", "খালিশপুর", "Khalishpur"]].map(([code, bn, en]) => ({ code, bn, en })),
  },
];

export const CURRICULA: Record<string, Bi> = {
  BANGLA_MEDIUM: { bn: "বাংলা মাধ্যম", en: "Bangla Medium" },
  ENGLISH_VERSION: { bn: "ইংলিশ ভার্সন", en: "English Version" },
  ENGLISH_MEDIUM_CAMBRIDGE: { bn: "ইংরেজি মাধ্যম (Cambridge)", en: "English Medium (Cambridge)" },
  ENGLISH_MEDIUM_EDEXCEL: { bn: "ইংরেজি মাধ্যম (Edexcel)", en: "English Medium (Edexcel)" },
  INTERNATIONAL_BACCALAUREATE: { bn: "IB", en: "International Baccalaureate" },
  MADRASAH_ALIA: { bn: "আলিয়া মাদ্রাসা", en: "Madrasah (Alia)" },
  MADRASAH_QAWMI: { bn: "কওমি মাদ্রাসা", en: "Madrasah (Qawmi)" },
  OTHER: { bn: "অন্যান্য", en: "Other" },
};

export const TUITION_TYPES: Record<string, Bi & { hint: Bi }> = {
  HOME: { bn: "হোম টিউশন", en: "Home tutoring", hint: { bn: "শিক্ষক বাসায় এসে পড়াবেন", en: "Tutor visits the student" } },
  ONLINE_ONE_TO_ONE: { bn: "অনলাইন ১-টু-১", en: "Online 1-on-1", hint: { bn: "LMS লাইভ ক্লাসরুম ও হোয়াইটবোর্ডে", en: "In the LMS live classroom & whiteboard" } },
  GROUP_BATCH: { bn: "ব্যাচ / গ্রুপ", en: "Batch / Group", hint: { bn: "একসাথে কয়েকজন শিক্ষার্থী", en: "Several students together" } },
};

export const GENDER_PREF: Record<string, Bi> = {
  ANY: { bn: "যেকোনো", en: "Any" },
  MALE: { bn: "পুরুষ", en: "Male" },
  FEMALE: { bn: "নারী", en: "Female" },
};

export const code2 = <T extends Item>(list: T[], code?: string | null) => list.find((x) => x.code === code);

export function gradeLabel(code: string, lang: keyof Bi) {
  return code2(GRADES, code)?.[lang] ?? code;
}
export function subjectLabel(code: string, lang: keyof Bi) {
  return code2(SUBJECTS, code)?.[lang] ?? code;
}
export function cityLabel(code: string | null | undefined, lang: keyof Bi) {
  return code2(CITIES, code)?.[lang] ?? code ?? "";
}
export function areaLabel(city: string | null | undefined, area: string | null | undefined, lang: keyof Bi) {
  const c = code2(CITIES, city);
  return (c && code2(c.areas, area)?.[lang]) ?? area ?? "";
}
export function locationLabel(p: { isOnline: boolean; city?: string | null; area?: string | null }, lang: keyof Bi) {
  if (p.isOnline) return lang === "bn" ? "অনলাইন" : "Online";
  return [areaLabel(p.city, p.area, lang), cityLabel(p.city, lang)].filter(Boolean).join(", ");
}

export const isGrade = (c: string) => GRADES.some((g) => g.code === c);
export const isSubject = (c: string) => SUBJECTS.some((g) => g.code === c);
export const isCity = (c: string) => CITIES.some((g) => g.code === c);
export const isArea = (city: string, area: string) => !!code2(CITIES, city)?.areas.some((a) => a.code === area);

/** Area label when only the area code is known (tutor preferences). */
export function anyAreaLabel(area: string, lang: keyof Bi) {
  for (const c of CITIES) { const a = code2(c.areas, area); if (a) return a[lang]; }
  return area;
}
