import Link from "next/link";
import { CITIES, CURRICULA, SUBJECTS } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/i18n";
import { listTutors } from "@/server/services/tutors";
import { TutorCard } from "@/components/Cards";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export const metadata = { title: "Find tutors" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function TutorsPage({ searchParams }: PageProps<"/tutors">) {
  const sp = await searchParams;
  const { t, lang } = await getT();
  const g = one(sp.gender);
  const { items, total, page, pages } = await listTutors({ q: one(sp.q)?.slice(0, 80), subject: one(sp.subject), city: one(sp.city), curriculum: one(sp.curriculum), gender: g === "MALE" || g === "FEMALE" ? g : undefined, page: Number(one(sp.page)) || 1 });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">{t("যাচাইকৃত শিক্ষক", "Verified tutors")}</h1>
      <p className="mt-2 text-muted-foreground">{t("প্রত্যেকের NID/পাসপোর্ট ও শিক্ষাগত ডকুমেন্ট অ্যাডমিন যাচাই করেছেন।", "Every tutor's NID/passport and education documents are checked by our team.")}</p>
      <form className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input name="q" defaultValue={one(sp.q)} placeholder={t("নাম / বিশ্ববিদ্যালয় / বিভাগ", "Name / university / department")} className="lg:col-span-2" />
        <Select name="subject" defaultValue={one(sp.subject) ?? ""}><option value="">{t("সব বিষয়", "All subjects")}</option>{SUBJECTS.filter((s) => s.code !== "ALL").map((s) => <option key={s.code} value={s.code}>{s[lang]}</option>)}</Select>
        <Select name="curriculum" defaultValue={one(sp.curriculum) ?? ""}><option value="">{t("সব মাধ্যম", "All curricula")}</option>{Object.entries(CURRICULA).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}</Select>
        <Select name="city" defaultValue={one(sp.city) ?? ""}><option value="">{t("সব শহর", "All cities")}</option>{CITIES.map((c) => <option key={c.code} value={c.code}>{c[lang]}</option>)}</Select>
        <div className="flex gap-2"><Select name="gender" defaultValue={g ?? ""}><option value="">{t("যেকোনো", "Any")}</option><option value="MALE">{t("পুরুষ", "Male")}</option><option value="FEMALE">{t("নারী", "Female")}</option></Select><Button>{t("খুঁজুন", "Go")}</Button></div>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">{formatNumber(total, lang)} {t("জন শিক্ষক", "tutors")}</p>
      {items.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((x) => <TutorCard key={x.id} tutor={x} lang={lang} />)}</div>
        : <p className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("কোনো শিক্ষক পাওয়া যায়নি।", "No tutors found.")}</p>}
      {pages > 1 && <div className="mt-8 flex justify-center gap-2">{page > 1 && <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/tutors?page=${page - 1}`}>←</Link>}{page < pages && <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/tutors?page=${page + 1}`}>→</Link>}</div>}
    </div>
  );
}
