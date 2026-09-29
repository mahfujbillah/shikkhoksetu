import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { reviewKycAction, setVerificationAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/FormBits";
import { KycFileButton } from "@/components/KycFileButton";
import { Empty } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function KycQueue({ searchParams }: PageProps<"/admin/kyc">) {
  await requireAdmin();
  const { t, lang } = await getT();
  const tab = ((await searchParams).tab as string) ?? "PENDING";
  const profiles = await db.tutorProfile.findMany({
    where: tab === "ALL" ? {} : { verificationStatus: tab as "PENDING" },
    orderBy: { updatedAt: "asc" },
    take: 50,
    include: { user: { select: { fullName: true, email: true, phone: true } }, kycDocuments: { orderBy: { createdAt: "desc" } } },
  });
  return (
    <>
      <div className="mb-4 flex gap-1">{["PENDING", "UNVERIFIED", "REJECTED", "VERIFIED", "ALL"].map((k) => <Link key={k} href={`/admin/kyc?tab=${k}`} className={cn("rounded-full px-3 py-1.5 text-sm", tab === k ? "bg-primary text-primary-foreground" : "border border-border")}>{k}</Link>)}</div>
      {profiles.length === 0 ? <Empty>{t("এই তালিকায় কেউ নেই।", "Nobody in this queue.")}</Empty> : (
        <div className="space-y-4">
          {profiles.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/tutors/${p.id}`} className="font-bold hover:text-primary">{p.user.fullName}</Link> <StatusBadge status={p.verificationStatus} lang={lang} />
                  <p className="text-sm text-muted-foreground">{p.university}{p.department ? ` · ${p.department}` : ""} · {p.user.email} · {p.user.phone ?? "—"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={setVerificationAction} fields={{ tutorProfileId: p.id, status: "VERIFIED" }} size="sm">{t("ভেরিফাইড ব্যাজ দিন", "Issue Verified badge")}</ActionButton>
                  <ActionButton action={setVerificationAction} fields={{ tutorProfileId: p.id, status: "REJECTED", note: "Documents unclear — please upload clearer copies." }} size="sm" variant="ghost">{t("ফেরত পাঠান", "Return")}</ActionButton>
                  {p.verificationStatus === "VERIFIED" && <ActionButton action={setVerificationAction} fields={{ tutorProfileId: p.id, status: "UNVERIFIED", note: "Verification revoked by admin" }} size="sm" variant="destructive" confirm="Revoke badge?">{t("ব্যাজ বাতিল", "Revoke")}</ActionButton>}
                </div>
              </div>
              <ul className="mt-4 divide-y divide-border text-sm">
                {p.kycDocuments.length === 0 && <li className="py-2 text-muted-foreground">{t("কোনো ডকুমেন্ট নেই।", "No documents.")}</li>}
                {p.kycDocuments.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span><b>{d.type.replaceAll("_", " ")}</b> · {d.fileName} · <span className="text-muted-foreground">{formatDate(d.createdAt, lang)}</span> <StatusBadge status={d.status} lang={lang} /></span>
                    <span className="flex flex-wrap gap-2">
                      <KycFileButton docId={d.id} />
                      {d.status !== "APPROVED" && <ActionButton action={reviewKycAction} fields={{ docId: d.id, decision: "approve" }} size="sm" variant="outline">{t("অনুমোদন", "Approve")}</ActionButton>}
                      {d.status !== "REJECTED" && <ActionButton action={reviewKycAction} fields={{ docId: d.id, decision: "reject", reason: "Unclear or invalid document" }} size="sm" variant="ghost">{t("বাতিল", "Reject")}</ActionButton>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
