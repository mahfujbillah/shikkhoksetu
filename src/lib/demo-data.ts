// SAMPLE DATA ONLY — shown for design. Replaced by the database once the backend is connected.
// Indexes point into dict[lang].options arrays so every item renders in both languages.

export type Tuition = {
  id: number;
  cls: number; // options.classes
  subjects: number[]; // options.subjects
  area: number; // options.areas
  medium: number; // options.mediums
  gender: number; // options.genders
  days: number;
  salary: number;
  postedDaysAgo: number;
  applicants: number;
};

export type Tutor = {
  id: number;
  name: { bn: string; en: string };
  gender: 1 | 2;
  institution: { bn: string; en: string };
  subjects: number[];
  areas: number[];
  exp: number;
  salary: number;
  rating: number;
  reviews: number;
  verified: boolean;
};

export const tuitions: Tuition[] = [
  { id: 1, cls: 3, subjects: [1, 4], area: 0, medium: 0, gender: 0, days: 4, salary: 6000, postedDaysAgo: 0, applicants: 7 },
  { id: 2, cls: 1, subjects: [0], area: 5, medium: 2, gender: 2, days: 5, salary: 4500, postedDaysAgo: 1, applicants: 12 },
  { id: 3, cls: 4, subjects: [4, 5], area: 2, medium: 0, gender: 1, days: 3, salary: 8000, postedDaysAgo: 1, applicants: 4 },
  { id: 4, cls: 6, subjects: [9, 10], area: 3, medium: 3, gender: 0, days: 5, salary: 3500, postedDaysAgo: 2, applicants: 9 },
  { id: 5, cls: 2, subjects: [1, 2], area: 1, medium: 1, gender: 2, days: 3, salary: 7000, postedDaysAgo: 2, applicants: 5 },
  { id: 6, cls: 5, subjects: [1, 4, 5], area: 6, medium: 0, gender: 0, days: 4, salary: 10000, postedDaysAgo: 3, applicants: 3 },
  { id: 7, cls: 0, subjects: [0], area: 4, medium: 0, gender: 2, days: 6, salary: 3000, postedDaysAgo: 3, applicants: 15 },
  { id: 8, cls: 3, subjects: [8, 2], area: 7, medium: 0, gender: 0, days: 3, salary: 5000, postedDaysAgo: 4, applicants: 6 },
  { id: 9, cls: 4, subjects: [2, 7], area: 8, medium: 2, gender: 1, days: 3, salary: 6500, postedDaysAgo: 5, applicants: 2 },
  { id: 10, cls: 2, subjects: [6, 5], area: 9, medium: 0, gender: 0, days: 4, salary: 5500, postedDaysAgo: 6, applicants: 8 },
];

export const tutors: Tutor[] = [
  { id: 1, name: { bn: "তানভীর আহমেদ", en: "Tanvir Ahmed" }, gender: 1, institution: { bn: "বুয়েট — সিভিল ইঞ্জিনিয়ারিং", en: "BUET — Civil Engineering" }, subjects: [1, 4], areas: [2, 3], exp: 4, salary: 7000, rating: 4.9, reviews: 38, verified: true },
  { id: 2, name: { bn: "নুসরাত জাহান", en: "Nusrat Jahan" }, gender: 2, institution: { bn: "ঢাকা বিশ্ববিদ্যালয় — ইংরেজি", en: "University of Dhaka — English" }, subjects: [2, 3], areas: [0, 5], exp: 3, salary: 5000, rating: 4.8, reviews: 26, verified: true },
  { id: 3, name: { bn: "মাহমুদুল হাসান", en: "Mahmudul Hasan" }, gender: 1, institution: { bn: "জাহাঙ্গীরনগর বিশ্ববিদ্যালয় — রসায়ন", en: "Jahangirnagar University — Chemistry" }, subjects: [5, 6], areas: [8], exp: 5, salary: 6500, rating: 4.7, reviews: 41, verified: true },
  { id: 4, name: { bn: "হাফেজা সুমাইয়া", en: "Hafeza Sumaiya" }, gender: 2, institution: { bn: "জামিয়া — কুরআন ও আরবি", en: "Jamia — Quran & Arabic" }, subjects: [9, 10], areas: [5, 6], exp: 6, salary: 3500, rating: 5.0, reviews: 19, verified: true },
  { id: 5, name: { bn: "রাফি ইসলাম", en: "Rafi Islam" }, gender: 1, institution: { bn: "নর্থ সাউথ ইউনিভার্সিটি — CSE", en: "North South University — CSE" }, subjects: [1, 7], areas: [6, 4], exp: 2, salary: 6000, rating: 4.6, reviews: 12, verified: false },
  { id: 6, name: { bn: "ফারহানা আক্তার", en: "Farhana Akter" }, gender: 2, institution: { bn: "ইডেন কলেজ — হিসাববিজ্ঞান", en: "Eden College — Accounting" }, subjects: [8, 3], areas: [7, 2], exp: 3, salary: 4500, rating: 4.8, reviews: 22, verified: true },
];
