import { Crown } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { BlockButton, GrantCredits, RoleSelect } from "@/components/AdminUserRow";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const q = ((await searchParams).q as string | undefined)?.trim().slice(0, 80);
  const where: Prisma.UserWhereInput = q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {};
  const users = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { tutorProfile: { select: { id: true, verificationStatus: true, creditBalance: true } } } });
  return (
    <>
      <form className="mb-4 flex max-w-md gap-2"><Input name="q" defaultValue={q} placeholder={t("নাম, ইমেইল বা ফোন", "Name, email or phone")} /><Button>{t("খুঁজুন", "Search")}</Button></form>
      <Card className="divide-y divide-border">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 font-semibold">{u.fullName}{u.isSuperAdmin && <Crown className="size-4 text-accent" />}{u.isBlocked && <Badge variant="destructive">{t("ব্লকড", "Blocked")}</Badge>}{u.tutorProfile && <StatusBadge status={u.tutorProfile.verificationStatus} lang={lang} />}</p>
              <p className="truncate text-muted-foreground">{u.email} · {u.phone ?? "—"} · {formatDate(u.createdAt, lang)}{u.tutorProfile ? ` · ${u.tutorProfile.creditBalance} credits` : ""}</p>
            </div>
            {u.isSuperAdmin ? <Badge variant="warning">Super admin</Badge> : (
              <div className="flex flex-wrap items-center gap-2">
                {me.isSuperAdmin ? <RoleSelect userId={u.id} role={u.role} /> : <Badge variant="secondary">{u.role}</Badge>}
                {u.tutorProfile && <GrantCredits tutorProfileId={u.tutorProfile.id} />}
                {(u.role !== "ADMIN" || me.isSuperAdmin) && <BlockButton userId={u.id} blocked={u.isBlocked} />}
              </div>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
