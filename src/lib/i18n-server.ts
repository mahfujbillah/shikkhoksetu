import "server-only";
import { cookies } from "next/headers";
import { makeT, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "bn";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
