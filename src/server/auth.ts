import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { supabaseServer } from "@/lib/supabase-server";
import type { UserRole } from "@/generated/prisma/enums";
import { DomainError } from "./errors";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isBlocked: boolean;
  tutorProfileId: string | null;
};

const SELECT = {
  id: true, email: true, fullName: true, phone: true, role: true, isSuperAdmin: true, isBlocked: true,
  tutorProfile: { select: { id: true } },
} as const;

type Row = { id: string; email: string; fullName: string; phone: string | null; role: UserRole; isSuperAdmin: boolean; isBlocked: boolean; tutorProfile: { id: string } | null };
const toSession = (u: Row): SessionUser => ({ ...u, tutorProfileId: u.tutorProfile?.id ?? null });

/**
 * Resolve the signed-in user for this request (memoised per request with React cache).
 * Supabase proves identity; our `users` table holds role/flags. A DB trigger creates the row on
 * sign-up, and we upsert here as a fallback so a missing trigger never locks anyone out.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Local development only: impersonate a seeded user without Supabase.
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_USER_ID) {
    const u = await db.user.findUnique({ where: { id: process.env.DEV_AUTH_USER_ID }, select: SELECT });
    return u ? toSession(u) : null;
  }

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser(); // verifies the JWT with Supabase (not just decoding)
  const au = data.user;
  if (!au?.email) return null;

  const existing = await db.user.findUnique({ where: { id: au.id }, select: SELECT });
  if (existing) return toSession(existing);

  const meta = (au.user_metadata ?? {}) as { full_name?: string; role?: string };
  const created = await db.user.upsert({
    where: { id: au.id },
    update: {},
    create: {
      id: au.id,
      email: au.email,
      fullName: meta.full_name?.trim() || au.email.split("@")[0],
      role: meta.role === "tutor" ? "TUTOR" : "STUDENT_GUARDIAN", // never ADMIN from client metadata
    },
    select: SELECT,
  });
  return toSession(created);
});

/** Throws a DomainError unless a signed-in, non-blocked user with one of `roles` is present. */
export async function requireUser(roles?: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new DomainError("UNAUTHENTICATED");
  if (user.isBlocked) throw new DomainError("BLOCKED");
  if (roles && !roles.includes(user.role) && user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  return user;
}

export async function requireAdmin(opts?: { superOnly?: boolean }): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  if (opts?.superOnly && !user.isSuperAdmin) throw new DomainError("FORBIDDEN");
  return user;
}
