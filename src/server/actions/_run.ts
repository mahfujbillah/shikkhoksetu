import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { getLang } from "@/lib/i18n-server";
import { DomainError, ERROR_MESSAGES, type ActionResult } from "../errors";

/**
 * Wraps a server action body: converts DomainError / ZodError into a serialisable ActionResult
 * with a message in the visitor's language. Unexpected errors are logged and hidden from the client.
 * NOTE: call redirect() *outside* run() — redirect works by throwing.
 */
export async function run<T>(fn: () => Promise<T>, success?: [string, string]): Promise<ActionResult<T>> {
  const lang = await getLang();
  const pick = (m: readonly [string, string]) => (lang === "bn" ? m[0] : m[1]);
  try {
    const data = await fn();
    return { ok: true, data, message: success ? pick(success) : undefined };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "VALIDATION", error: pick(ERROR_MESSAGES.VALIDATION), fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]> };
    }
    if (e instanceof DomainError) {
      const custom = e.message !== ERROR_MESSAGES[e.code][1] ? e.message : null;
      return { ok: false, code: e.code, error: custom && lang === "en" ? custom : pick(ERROR_MESSAGES[e.code]) + (custom && lang === "bn" ? ` (${custom})` : "") };
    }
    console.error("[action] unexpected error", e);
    return { ok: false, code: "UNKNOWN", error: lang === "bn" ? "অপ্রত্যাশিত সমস্যা হয়েছে, আবার চেষ্টা করুন।" : "Something went wrong, please try again." };
  }
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
