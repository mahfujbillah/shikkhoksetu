"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dict, type Dict, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void; num: (n: number | string) => string };

const LangContext = createContext<Ctx | null>(null);

const bnDigits = "০১২৩৪৫৬৭৮৯";
export function toBn(n: number | string) {
  return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  }, []);

  const num = useCallback(
    (n: number | string) => (lang === "bn" ? toBn(typeof n === "number" ? n.toLocaleString("en-IN") : n) : typeof n === "number" ? n.toLocaleString("en-IN") : n),
    [lang],
  );

  return <LangContext.Provider value={{ lang, t: dict[lang] as Dict, setLang, num }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
