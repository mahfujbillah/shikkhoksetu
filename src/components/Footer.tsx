"use client";

import Link from "next/link";
import { GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import { useLang } from "./LanguageProvider";

export function Footer() {
  const { t, num } = useLang();
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">{t.brand}</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t.footer.about}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t.footer.links}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/tuitions" className="hover:text-primary">{t.nav.tuitions}</Link></li>
            <li><Link href="/tutors" className="hover:text-primary">{t.nav.tutors}</Link></li>
            <li><Link href="/post-tuition" className="hover:text-primary">{t.nav.post}</Link></li>
            <li><Link href="/become-tutor" className="hover:text-primary">{t.nav.become}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t.footer.contact}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4" /> {num("01XXXXXXXXX")}</li>
            <li className="flex items-center gap-2"><Mail className="size-4" /> hello@example.com</li>
            <li className="flex items-center gap-2"><MapPin className="size-4" /> {t.options.areas[0]}, Dhaka</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {num("2026")} {t.brand}. {t.footer.rights}.
      </div>
    </footer>
  );
}
