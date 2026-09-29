import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { A, CrmHeader, FilterPills, one, Pager, paging, Table, Td } from "@/components/admin/Crm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminSessions({ searchParams }: PageProps<"/admin/sessions">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const tab = one(sp.tab) === "salary" ? "salary" : "sessions";
  const { page, skip, take } = paging(sp);
  const party = { select: { id: true, agreementNumber: true, guardian: { select: { fullName: true } }, tutorProfile: { select: { user: { select: { fullName: true } } } } } } as const;
  const tabs = <FilterPills base="/admin/sessions" param="tab" value={tab === "salary" ? "salary" : ""} sp={sp} options={[["", t("ক্লাস লগ", "Session logs")], ["salary", t("বেতন পরিশোধ", "Salary payments")]]} />;
  if (tab === "salary") {
    const [rows, total] = await Promise.all([db.salaryPayment.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { agreement: party } }), db.salaryPayment.count()]);
    return (
      <>
        <CrmHeader title={t("বেতন পরিশোধ", "Salary payments")} desc={t("অভিভাবক শিক্ষককে যে মাসিক বেতন দিয়েছেন তার রেকর্ড।", "Monthly salary records between guardian and tutor.")} />{tabs}
        <Table head={[t("মাস", "Month"), t("চুক্তি", "Agreement"), t("পরিমাণ", "Amount"), t("মাধ্যম", "Method"), t("অবস্থা", "Status"), t("শিক্ষক নিশ্চিত", "Tutor confirmed")]} empty={rows.length === 0}>
          {rows.map((s) => <tr key={s.id}><Td>{s.periodMonth}</Td><Td><A href={`/admin/agreements/${s.agreement.id}`}>#{s.agreement.agreementNumber}</A> <span className="text-xs text-muted-foreground">{s.agreement.guardian.fullName} → {s.agreement.tutorProfile.user.fullName}</span></Td><Td>{formatMoney(String(s.amount), lang)}</Td><Td>{s.method ?? "—"}</Td><Td><StatusBadge status={s.status} lang={lang} /></Td><Td>{s.confirmedByTutor ? "✓" : "—"}</Td></tr>)}
        </Table>
        <Pager base="/admin/sessions" sp={sp} page={page} total={total} />
      </>
    );
  }
  const [rows, total] = await Promise.all([db.tutoringSession.findMany({ orderBy: { date: "desc" }, skip, take, include: { agreement: party } }), db.tutoringSession.count()]);
  return (
    <>
      <CrmHeader title={t("ক্লাস লগ", "Session logs")} desc={t("শিক্ষকরা প্রতিদিনের ক্লাসের যে লগ দিয়েছেন।", "Daily class logs submitted by tutors.")} />{tabs}
      <Table head={[t("তারিখ", "Date"), t("চুক্তি", "Agreement"), t("সময়", "Duration"), t("বিষয়বস্তু", "Topics"), t("অবস্থা", "Status"), t("অভিভাবক", "Guardian")]} empty={rows.length === 0}>
        {rows.map((s) => <tr key={s.id}><Td className="whitespace-nowrap">{formatDate(s.date, lang)}</Td><Td><A href={`/admin/agreements/${s.agreement.id}`}>#{s.agreement.agreementNumber}</A> <span className="text-xs text-muted-foreground">{s.agreement.tutorProfile.user.fullName}</span></Td><Td>{s.durationMinutes} min</Td><Td className="max-w-xs text-muted-foreground">{s.topicsCovered}</Td><Td>{s.status}</Td><Td>{s.guardianConfirmed ? `✓ ${s.studentRating ? "★".repeat(s.studentRating) : ""}` : "—"}</Td></tr>)}
      </Table>
      <Pager base="/admin/sessions" sp={sp} page={page} total={total} />
    </>
  );
}
