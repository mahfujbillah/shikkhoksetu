import { Crown } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { BlockButton, RoleSelect } from "@/components/AdminUserRow";
import { A, CrmHeader, ExportLink, FilterPills, one, Pager, paging, SearchBox, Table, Td } from "@/components/admin/Crm";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const role = one(sp.role);
  const blocked = one(sp.blocked);
  const { page, skip, take } = paging(sp);
  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(role === "TUTOR" || role === "STUDENT_GUARDIAN" || role === "ADMIN" ? { role } : {}),
    ...(blocked === "1" ? { isBlocked: true } : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { tutorProfile: { select: { id: true, verificationStatus: true, creditBalance: true } }, _count: { select: { tuitionPosts: true, invoices: true } } } }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <CrmHeader title={t("ব্যবহারকারী", "Users")} desc={t("যেকোনো ব্যবহারকারীর নামে ক্লিক করে পুরো প্রোফাইল, ইতিহাস ও নিয়ন্ত্রণ দেখুন।", "Click a name for the full 360° profile, history and controls.")}><ExportLink entity="users" query={{ q, role, blocked }} /></CrmHeader>
      <SearchBox q={q} placeholder={t("নাম, ইমেইল বা ফোন", "Name, email or phone")} hidden={{ role, blocked }} />
      <FilterPills base="/admin/users" param="role" value={role} sp={sp} options={[["", t("সবাই", "All")], ["TUTOR", t("শিক্ষক", "Tutors")], ["STUDENT_GUARDIAN", t("অভিভাবক/ছাত্র", "Guardians")], ["ADMIN", "Admins"]]} />
      <FilterPills base="/admin/users" param="blocked" value={blocked} sp={sp} options={[["", t("সব অবস্থা", "Any status")], ["1", t("শুধু ব্লকড", "Blocked only")]]} />
      <Table head={[t("নাম", "Name"), t("যোগাযোগ", "Contact"), t("ভূমিকা", "Role"), t("তথ্য", "Info"), t("যোগদান", "Joined"), ""]} empty={users.length === 0}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-muted/40">
            <Td><span className="flex flex-wrap items-center gap-1.5"><A href={`/admin/users/${u.id}`}>{u.fullName}</A>{u.isSuperAdmin && <Crown className="size-4 text-accent" />}{u.isBlocked && <Badge variant="destructive">{t("ব্লকড", "Blocked")}</Badge>}</span></Td>
            <Td className="text-muted-foreground">{u.email}<br />{u.phone ?? "—"}</Td>
            <Td>{me.isSuperAdmin && !u.isSuperAdmin ? <RoleSelect userId={u.id} role={u.role} /> : <Badge variant="secondary">{u.isSuperAdmin ? "Super admin" : u.role}</Badge>}</Td>
            <Td className="text-xs">{u.tutorProfile ? <><StatusBadge status={u.tutorProfile.verificationStatus} lang={lang} /> · {u.tutorProfile.creditBalance} cr</> : `${u._count.tuitionPosts} ${t("পোস্ট", "posts")}`} · {u._count.invoices} inv</Td>
            <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt, lang)}</Td>
            <Td>{!u.isSuperAdmin && (u.role !== "ADMIN" || me.isSuperAdmin) && <BlockButton userId={u.id} blocked={u.isBlocked} />}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/users" sp={sp} page={page} total={total} />
    </>
  );
}
