import "server-only";
import { db } from "@/lib/db";
import type { ApplyViewer } from "@/components/ApplyDialog";
import { getSessionUser } from "./auth";

/** What the Apply button needs to know about the current visitor (for the given posts). */
export async function getApplyViewer(postIds: string[]): Promise<ApplyViewer> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { signedIn: false, appliedPostIds: [] };
  if (user.role !== "TUTOR") return { signedIn: true, userId: user.id, role: user.role, appliedPostIds: [] };
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, select: { id: true, verificationStatus: true, verificationNote: true, gender: true } });
  const applied = profile && postIds.length
    ? await db.tuitionApplication.findMany({ where: { tutorProfileId: profile.id, postId: { in: postIds } }, select: { postId: true } })
    : [];
  return { signedIn: true, userId: user.id, role: "TUTOR", verification: profile?.verificationStatus ?? null, verificationNote: profile?.verificationNote ?? null, gender: profile?.gender ?? null, appliedPostIds: applied.map((a) => a.postId) };
}
