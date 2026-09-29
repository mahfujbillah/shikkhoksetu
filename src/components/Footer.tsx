import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { getT } from "@/lib/i18n-server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><GraduationCap className="size-5" /></span>
            <span className="font-display text-lg font-bold">{t("শিক্ষকসেতু", "ShikkhokSetu")}</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("যাচাইকৃত শিক্ষক, শর্টলিস্ট, ট্রায়াল ক্লাস আর ডিজিটাল চুক্তি — হোম ও অনলাইন টিউশনের আধুনিক মার্কেটপ্লেস, আপনার LMS-এর সাথে যুক্ত।", "Verified tutors, shortlists, trial classes and digital agreements — a modern marketplace for home and online tuition, connected to your LMS.")}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t("অভিভাবক", "Guardians")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/post-tuition" className="hover:text-primary">{t("টিউশন পোস্ট করুন", "Post a tuition")}</Link></li>
            <li><Link href="/tutors" className="hover:text-primary">{t("যাচাইকৃত শিক্ষক", "Verified tutors")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t("শিক্ষক", "Tutors")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/tuitions" className="hover:text-primary">{t("টিউশন জব বোর্ড", "Tuition job board")}</Link></li>
            <li><Link href="/signup?role=tutor" className="hover:text-primary">{t("শিক্ষক হিসেবে যোগ দিন", "Become a tutor")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">© 2026 {t("শিক্ষকসেতু", "ShikkhokSetu")}</div>
    </footer>
  );
}
