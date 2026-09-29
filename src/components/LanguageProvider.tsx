"use client";

import { createContext, useContext, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { makeT, type Lang, type T } from "@/lib/i18n";
import { setLanguageAction } from "@/server/actions/account";
import { cn } from "@/lib/utils";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "bn", t: makeT("bn") });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: makeT(lang) }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

export function LangToggle() {
  const { lang } = useT();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const path = `${pathname}${search.size ? `?${search}` : ""}`;
  return (
    <div className={cn("flex rounded-full border border-border p-0.5 text-xs font-semibold", pending && "opacity-60")}>
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => start(() => setLanguageAction(l, path))}
          className={cn("rounded-full px-2.5 py-1 transition", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );
}
