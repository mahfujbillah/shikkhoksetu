import Link from "next/link";
import { ArrowRight, Bell, FileSignature, IdCard, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { formatNumber, timeAgo } from "@/lib/i18n";
import { requireUser } from "@/server/auth";
import { markOverdueInvoices } from "@/server/services/billing";
import { markNotificationsReadAction } from "@/server/actions/account";
import { PageHeader } from "@/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DashboardHome() {
  const user = await requireUser();
  const { t, lang } = await getT();
  await markOverdueInvoices().catch(() => null);
  const tutor = user.role === "TUTOR";

  const [notifications, toSign, dueInvoices, profile, counts] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.tuitionAgreement.findMany({ where: tutor ? { tutorProfile: { userId: user.id }, status: "PENDING_SIGNATURES" } : { guardianId: user.id, status: "PENDING_SIGNATURES" }, include: { post: { select: { number: true, title: true } } } }),
    db.invoice.count({ where: { billedToId: user.id, status: { in: ["ISSUED", "OVERDUE"] } } }),
    tutor ? db.tutorProfile.findUnique({ where: { userId: user.id }, select: { verificationStatus: true, verificationNote: true, creditBalance: true } }) : null,
    tutor
      ? Promise.all([db.tuitionApplication.count({ where: { tutorProfile: { userId: user.id } } }), db.tuitionApplication.count({ where: { tutorProfile: { userId: user.id }, status: "SHORTLISTED" } }), db.tuitionAgreement.count({ where: { tutorProfile: { userId: user.id }, status: "ACTIVE" } })])
      : Promise.all([db.tuitionPost.count({ where: { guardianId: user.id, status: { in: ["OPEN", "SHORTLISTED"] } } }), db.tuitionApplication.count({ where: { post: { guardianId: user.id }, status: "PENDING" } }), db.tuitionAgreement.count({ where: { guardianId: user.id, status: "ACTIVE" } })]),
  ]);

  const stats = tutor
    ? [[counts[0], t("মোট আবেদন", "Applications")], [counts[1], t("শর্টলিস্টেড", "Shortlisted")], [counts[2], t("চলমান টিউশন", "Active tuitions")]]
    : [[counts[0], t("খোলা পোস্ট", "Open posts")], [counts[1], t("নতুন আবেদন", "New applicants")], [counts[2], t("চলমান টিউশন", "Active tuitions")]];

  return (
    <>
      <PageHeader title={t(`স্বাগতম, ${user.fullName}`, `Welcome, ${user.fullName}`)}>
        {tutor ? <Link href="/tuitions" className={buttonVariants({ variant: "accent" })}>{t("মিলে যাওয়া জব দেখুন", "Browse matching jobs")}</Link> : <Link href="/post-tuition" className={buttonVariants({ variant: "accent" })}>{t("নতুন টিউশন পোস্ট", "Post a tuition")}</Link>}
      </PageHeader>

      <div className="space-y-3">
        {tutor && !profile && <Task icon={<IdCard />} text={t("শুরু করতে শিক্ষক প্রোফাইল পূরণ করুন।", "Complete your tutor profile to get started.")} href="/dashboard/profile" cta={t("প্রোফাইল", "Profile")} />}
        {tutor && profile && profile.verificationStatus !== "VERIFIED" && (
          <Task icon={<IdCard />} text={profile.verificationStatus === "PENDING" ? t("আপনার KYC যাচাই চলছে (২৪–৪৮ ঘণ্টা)।", "Your KYC is under review (24–48h).") : profile.verificationStatus === "REJECTED" ? t(`KYC ফেরত এসেছে: ${profile.verificationNote ?? ""}`, `KYC returned: ${profile.verificationNote ?? ""}`) : t("আবেদন করতে NID ও শিক্ষাগত ডকুমেন্ট জমা দিয়ে যাচাই হোন।", "Submit NID and education documents to get verified and start applying.")} href="/dashboard/kyc" cta="KYC" />
        )}
        {toSign.map((a) => (
          <Task key={a.id} icon={<FileSignature />} text={tutor ? t(`টিউশন #${a.post.number}-এর অফার — চুক্তিতে স্বাক্ষর করুন`, `Offer for tuition #${a.post.number} — review & sign the agreement`) : t(`চুক্তি #${a.agreementNumber} শিক্ষকের স্বাক্ষরের অপেক্ষায়`, `Agreement #${a.agreementNumber} is waiting for the tutor's signature`)} href={`/dashboard/agreements/${a.id}`} cta={t("দেখুন", "Open")} />
        ))}
        {dueInvoices > 0 && <Task icon={<Receipt />} text={t(`${formatNumber(dueInvoices, lang)}টি ইনভয়েস বকেয়া`, `${dueInvoices} invoice(s) due`)} href="/dashboard/invoices" cta={t("পরিশোধ", "Pay")} />}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map(([n, l]) => <Card key={String(l)} className="p-5"><p className="font-display text-3xl font-bold text-primary">{formatNumber(Number(n), lang)}</p><p className="text-sm text-muted-foreground">{l}</p></Card>)}
      </div>
      {tutor && profile && profile.creditBalance > 0 && <p className="mt-3 text-sm text-muted-foreground">{t("ক্রেডিট ব্যালান্স", "Credit balance")}: <b>{formatNumber(profile.creditBalance, lang)}</b></p>}

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-bold"><Bell className="size-4" /> {t("নোটিফিকেশন", "Notifications")}</h2>
          {notifications.some((n) => !n.readAt) && <form action={markNotificationsReadAction}><Button size="sm" variant="ghost">{t("সব পড়া হয়েছে", "Mark all read")}</Button></form>}
        </div>
        {notifications.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("এখনো কিছু নেই।", "Nothing yet.")}</p> : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className={`flex items-start justify-between gap-3 px-5 py-3 text-sm ${n.readAt ? "" : "bg-primary/5"}`}>
                <div className="min-w-0"><p className="font-medium">{n.title}</p>{n.body && <p className="truncate text-muted-foreground">{n.body}</p>}<p className="text-xs text-muted-foreground">{timeAgo(n.createdAt, lang)}</p></div>
                {n.link && <Link href={n.link} className="shrink-0 text-primary"><ArrowRight className="size-4" /></Link>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Task({ icon, text, href, cta }: { icon: React.ReactNode; text: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 [&_svg]:size-4">{icon} {text}</p>
      <Link href={href} className={buttonVariants({ size: "sm" })}>{cta}</Link>
    </div>
  );
}
