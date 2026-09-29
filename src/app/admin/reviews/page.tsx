import { db } from "@/lib/db";
import { timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, Pager, paging, Table, Td } from "@/components/admin/Crm";
import { DeleteReview } from "@/components/admin/CrmForms";

export default async function AdminReviews({ searchParams }: PageProps<"/admin/reviews">) {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const { page, skip, take } = paging(sp);
  const [rows, total] = await Promise.all([
    db.review.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { author: { select: { id: true, fullName: true } }, tutorProfile: { select: { user: { select: { id: true, fullName: true } } } }, agreement: { select: { id: true, agreementNumber: true } } } }),
    db.review.count(),
  ]);
  return (
    <>
      <CrmHeader title={t("রিভিউ", "Reviews")} desc={me.isSuperAdmin ? t("অনুপযুক্ত রিভিউ মুছে দিলে শিক্ষকের রেটিং নতুন করে হিসাব হবে।", "Deleting an abusive review recalculates the tutor's rating.") : undefined} />
      <Table head={[t("রেটিং", "Rating"), t("শিক্ষক", "Tutor"), t("লিখেছেন", "By"), t("মন্তব্য", "Comment"), t("চুক্তি", "Agreement"), ""]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-accent-foreground">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"☆".repeat(5 - r.rating)}</span></Td>
            <Td><A href={`/admin/users/${r.tutorProfile.user.id}`}>{r.tutorProfile.user.fullName}</A></Td>
            <Td><A href={`/admin/users/${r.author.id}`}>{r.author.fullName}</A><p className="text-xs text-muted-foreground">{timeAgo(r.createdAt, lang)}</p></Td>
            <Td className="max-w-sm">{r.comment}</Td>
            <Td><A href={`/admin/agreements/${r.agreement.id}`}>#{r.agreement.agreementNumber}</A></Td>
            <Td>{me.isSuperAdmin && <DeleteReview id={r.id} />}</Td>
          </tr>
        ))}
      </Table>
      <Pager base="/admin/reviews" sp={sp} page={page} total={total} />
    </>
  );
}
