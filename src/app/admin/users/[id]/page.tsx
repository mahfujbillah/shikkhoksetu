import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { gradeLabel, subjectLabel } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { getUser360 } from "@/server/services/crm";
import { reviewKycAction, setVerificationAction } from "@/server/actions/admin";
import { BlockButton, RoleSelect } from "@/components/AdminUserRow";
import { A, KV, NotesPanel, Section } from "@/components/admin/Crm";
import { AnnounceForm, CreditsForm, DeleteReview, ForceVerify, UserEditForm } from "@/components/admin/CrmForms";
import { ActionButton } from "@/components/FormBits";
import { KycFileButton } from "@/components/KycFileButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminUser360({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getUser360(id);
  if (!data) notFound();
  const { user: u, trail, notes } = data;
  const tp = u.tutorProfile;
  const canEdit = !u.isSuperAdmin || u.id === me.id;
  const unpaid = u.invoices.filter((i) => i.status === "ISSUED" || i.status === "OVERDUE").reduce((s, i) => s + Number(i.amount), 0);
  const paid = u.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {t("সব ব্যবহারকারী", "All users")}</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold">{u.fullName}{u.isSuperAdmin && <Crown className="size-5 text-accent" />}{u.isBlocked && <Badge variant="destructive">{t("ব্লকড", "Blocked")}</Badge>}<Badge variant="secondary">{u.role}</Badge>{tp && <StatusBadge status={tp.verificationStatus} lang={lang} />}</h2>
          <p className="text-sm text-muted-foreground">{u.email} · {u.phone ?? t("ফোন নেই", "no phone")} · {t("যোগদান", "joined")} {formatDate(u.createdAt, lang)}</p>
          <p className="font-mono text-xs text-muted-foreground">{u.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tp && <Link href={`/tutors/${tp.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("পাবলিক প্রোফাইল", "Public profile")}</Link>}
          {me.isSuperAdmin && !u.isSuperAdmin && <RoleSelect userId={u.id} role={u.role} />}
          {!u.isSuperAdmin && (u.role !== "ADMIN" || me.isSuperAdmin) && <BlockButton userId={u.id} blocked={u.isBlocked} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          [formatNumber(u.tuitionPosts.length, lang), t("টিউশন পোস্ট", "Posts")],
          [formatNumber(tp?.applications.length ?? 0, lang), t("আবেদন", "Applications")],
          [formatNumber(u.guardianAgreements.length + (tp?.agreements.length ?? 0), lang), t("চুক্তি", "Agreements")],
          [`${formatMoney(paid, lang)} / ${formatMoney(unpaid, lang)}`, t("পরিশোধিত / বকেয়া", "Paid / due")],
        ] as const).map(([v, l]) => <div key={l} className="rounded-2xl border border-border bg-card p-3"><p className="font-display text-xl font-bold text-primary">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canEdit && <Section title={t("তথ্য সম্পাদনা", "Edit details")}><UserEditForm user={{ id: u.id, fullName: u.fullName, phone: u.phone, lmsUserId: u.lmsUserId }} /></Section>}

          {tp && (
            <Section title={t("শিক্ষক প্রোফাইল", "Tutor profile")}>
              <KV rows={[
                [t("প্রতিষ্ঠান", "University"), `${tp.university}${tp.department ? ` · ${tp.department}` : ""}`],
                [t("শিরোনাম", "Headline"), tp.headline],
                [t("বিষয়", "Subjects"), tp.subjects.map((s) => subjectLabel(s, lang)).join(", ") || "—"],
                [t("শ্রেণি", "Grades"), tp.grades.map((g) => gradeLabel(g, lang)).join(", ") || "—"],
                [t("অভিজ্ঞতা", "Experience"), `${tp.experienceYears} ${t("বছর", "yrs")}`],
                [t("প্রত্যাশিত বেতন", "Expected salary"), tp.monthlyRate ? formatMoney(String(tp.monthlyRate), lang) : "—"],
                [t("রেটিং", "Rating"), `${Number(tp.ratingAvg).toFixed(1)} (${tp.ratingCount}) · ${tp.completedTuitions} ${t("সম্পন্ন", "completed")}`],
                [t("ক্রেডিট", "Credits"), String(tp.creditBalance)],
                [t("যাচাই নোট", "Verification note"), tp.verificationNote],
              ]} />
              <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4">
                <CreditsForm tutorProfileId={tp.id} />
                {me.isSuperAdmin && <ForceVerify tutorProfileId={tp.id} current={tp.verificationStatus} />}
              </div>
            </Section>
          )}

          {tp && (
            <Section title={t("KYC ডকুমেন্ট", "KYC documents")} action={tp.verificationStatus === "PENDING" ? <ActionButton action={setVerificationAction} fields={{ tutorProfileId: tp.id, status: "VERIFIED" }} size="sm">{t("ব্যাজ দিন", "Issue badge")}</ActionButton> : undefined}>
              {tp.kycDocuments.length === 0 ? <p className="text-sm text-muted-foreground">{t("কোনো ডকুমেন্ট নেই।", "No documents uploaded.")}</p> : (
                <ul className="divide-y divide-border text-sm">
                  {tp.kycDocuments.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><StatusBadge status={d.status} lang={lang} /> {d.type.replaceAll("_", " ")} · {d.fileName} · {formatDate(d.createdAt, lang)}{d.rejectionReason ? ` · ${d.rejectionReason}` : ""}</span>
                      <span className="flex gap-1">
                        <KycFileButton docId={d.id} />
                        {d.status !== "APPROVED" && <ActionButton action={reviewKycAction} fields={{ docId: d.id, decision: "approve" }} size="sm" variant="outline">{t("অনুমোদন", "Approve")}</ActionButton>}
                        {d.status !== "REJECTED" && <ActionButton action={reviewKycAction} fields={{ docId: d.id, decision: "reject", reason: "Document not acceptable" }} size="sm" variant="ghost">{t("বাতিল", "Reject")}</ActionButton>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {u.tuitionPosts.length > 0 && (
            <Section title={t("টিউশন পোস্ট", "Tuition posts")}>
              <ul className="divide-y divide-border text-sm">{u.tuitionPosts.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={p.status} lang={lang} /><A href={`/admin/tuitions/${p.id}`}>#{formatNumber(p.number, lang)} {p.title}</A><span className="text-muted-foreground">{formatMoney(String(p.budgetMax), lang)} · {p.applicationsCount} {t("আবেদন", "applicants")} · {timeAgo(p.createdAt, lang)}</span></li>)}</ul>
            </Section>
          )}

          {tp && tp.applications.length > 0 && (
            <Section title={t("আবেদনসমূহ", "Applications")}>
              <ul className="divide-y divide-border text-sm">{tp.applications.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/tuitions/${a.post.id}`}>#{formatNumber(a.post.number, lang)} {a.post.title}</A><span className="text-muted-foreground">{a.proposedSalary ? formatMoney(String(a.proposedSalary), lang) : ""} · {timeAgo(a.createdAt, lang)}</span></li>)}</ul>
            </Section>
          )}

          {(u.guardianAgreements.length > 0 || (tp?.agreements.length ?? 0) > 0) && (
            <Section title={t("চুক্তি", "Agreements")}>
              <ul className="divide-y divide-border text-sm">
                {u.guardianAgreements.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/agreements/${a.id}`}>#{a.agreementNumber}</A><span className="text-muted-foreground">{t("শিক্ষক", "Tutor")}: {a.tutorProfile.user.fullName} · {formatMoney(String(a.monthlySalary), lang)}</span></li>)}
                {tp?.agreements.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={a.status} lang={lang} /><A href={`/admin/agreements/${a.id}`}>#{a.agreementNumber}</A><span className="text-muted-foreground">{t("অভিভাবক", "Guardian")}: {a.guardian.fullName} · {formatMoney(String(a.monthlySalary), lang)}</span></li>)}
              </ul>
            </Section>
          )}

          {u.invoices.length > 0 && (
            <Section title={t("ইনভয়েস", "Invoices")}>
              <ul className="divide-y divide-border text-sm">{u.invoices.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2 py-2"><StatusBadge status={i.status} lang={lang} /><A href={`/admin/invoices?q=${i.invoiceNumber}`}>{i.invoiceNumber}</A><span className="text-muted-foreground">{i.type.replaceAll("_", " ")} · {formatMoney(String(i.amount), lang)} · {t("শেষ", "due")} {formatDate(i.dueDate, lang)}</span></li>)}</ul>
            </Section>
          )}

          {tp && tp.reviews.length > 0 && (
            <Section title={t("রিভিউ", "Reviews")}>
              <ul className="divide-y divide-border text-sm">{tp.reviews.map((r) => <li key={r.id} className="flex items-start justify-between gap-2 py-2"><span>{"★".repeat(r.rating)} <b>{r.author.fullName}</b> {r.comment}</span>{me.isSuperAdmin && <DeleteReview id={r.id} />}</li>)}</ul>
            </Section>
          )}

          {tp && tp.creditLedger.length > 0 && (
            <Section title={t("ক্রেডিট লেজার", "Credit ledger")}>
              <ul className="divide-y divide-border text-sm">{tp.creditLedger.map((c) => <li key={c.id} className="flex justify-between py-1.5"><span className="font-mono text-xs">{c.reason}</span><span className={c.delta > 0 ? "text-success" : "text-destructive"}>{c.delta > 0 ? "+" : ""}{c.delta} · {formatDate(c.createdAt, lang)}</span></li>)}</ul>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <NotesPanel title={t("অ্যাডমিন নোট", "Admin notes")} entity="User" entityId={u.id} notes={notes} when={(d) => timeAgo(d, lang)} />
          <Section title={t("নোটিফিকেশন পাঠান", "Send a notification")}><AnnounceForm userId={u.id} isSuper={me.isSuperAdmin} /></Section>
          <Section title={t("সাম্প্রতিক নোটিফিকেশন", "Recent notifications")}>
            <ul className="space-y-1.5 text-sm">{u.notifications.length === 0 ? <li className="text-muted-foreground">—</li> : u.notifications.map((n) => <li key={n.id}><span className={n.readAt ? "text-muted-foreground" : "font-medium"}>{n.title}</span> <span className="text-xs text-muted-foreground">· {timeAgo(n.createdAt, lang)}</span></li>)}</ul>
          </Section>
          <Section title={t("অডিট ট্রেইল", "Audit trail")}>
            <ul className="space-y-1.5 text-xs">{trail.length === 0 ? <li className="text-muted-foreground">—</li> : trail.map((a) => <li key={a.id}><span className="font-mono">{a.action}</span> · {a.actor?.fullName ?? "System"} · <span className="text-muted-foreground">{timeAgo(a.createdAt, lang)}</span></li>)}</ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
