import Link from "next/link";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { getMyTutorProfile } from "@/server/services/tutors";
import { submitKycAction } from "@/server/actions/account";
import { ActionForm, SubmitButton } from "@/components/FormBits";
import { KycUploader } from "@/components/KycUploader";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function KycPage() {
  const user = await requireUser(["TUTOR"]);
  const { t, lang } = await getT();
  const p = await getMyTutorProfile(user.id);
  if (!p) return (<><PageHeader title="KYC" /><Card className="p-8 text-center"><p>{t("আগে শিক্ষক প্রোফাইল পূরণ করুন।", "Please complete your tutor profile first.")}</p><Link href="/dashboard/profile" className={buttonVariants({ className: "mt-4" })}>{t("প্রোফাইল", "Profile")}</Link></Card></>);

  const docs = p.kycDocuments;
  const has = (types: string[]) => docs.some((d) => types.includes(d.type) && d.status !== "REJECTED");
  const steps = [
    { ok: has(["NID", "PASSPORT"]), label: t("পরিচয়পত্র: NID বা পাসপোর্ট", "Identity: NID or passport") },
    { ok: has(["STUDENT_ID", "EDUCATIONAL_CERTIFICATE"]), label: t("শিক্ষা: স্টুডেন্ট আইডি বা সনদ", "Education: student ID or certificate") },
    { ok: p.verificationStatus === "PENDING" || p.verificationStatus === "VERIFIED", label: t("যাচাইয়ের জন্য জমা", "Submitted for review") },
    { ok: p.verificationStatus === "VERIFIED", label: t("যাচাইকৃত ব্যাজ", "Verified badge issued") },
  ];
  const canSubmit = steps[0].ok && steps[1].ok && (p.verificationStatus === "UNVERIFIED" || p.verificationStatus === "REJECTED");

  return (
    <>
      <PageHeader title={t("KYC ও যাচাই", "KYC & verification")} desc={t("ডকুমেন্টগুলো প্রাইভেট স্টোরেজে থাকে — শুধু অ্যাডমিন দেখতে পারেন।", "Documents are kept in private storage — only admins can view them.")}><StatusBadge status={p.verificationStatus} lang={lang} /></PageHeader>
      {p.verificationStatus === "REJECTED" && p.verificationNote && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.verificationNote}</p>}
      <div className="grid gap-4 sm:grid-cols-4">
        {steps.map((s, i) => <Card key={i} className={`p-4 text-sm ${s.ok ? "border-success/40 bg-success/5" : ""}`}><p className="font-display text-2xl font-bold text-primary">{i + 1}</p><p className="mt-1">{s.label}</p><p className="mt-1 text-xs">{s.ok ? "✓" : "…"}</p></Card>)}
      </div>
      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-bold"><FileCheck2 className="size-4" /> {t("ডকুমেন্ট আপলোড", "Upload documents")}</h2>
        <div className="mt-4"><KycUploader userId={user.id} /></div>
        <ul className="mt-5 divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span><b>{d.type.replaceAll("_", " ")}</b> · {d.fileName} · <span className="text-muted-foreground">{formatDate(d.createdAt, lang)}</span></span>
              <span className="flex items-center gap-2"><StatusBadge status={d.status} lang={lang} />{d.rejectionReason && <span className="text-xs text-destructive">{d.rejectionReason}</span>}</span>
            </li>
          ))}
        </ul>
      </Card>
      {canSubmit && (
        <ActionForm action={submitKycAction} className="mt-6">
          <SubmitButton size="lg"><ShieldCheck /> {t("যাচাইয়ের জন্য জমা দিন", "Submit for verification")}</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
