import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSignature, Laptop, ListChecks, Receipt, ShieldCheck, Video } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/i18n";
import { PUBLIC_POST_SELECT } from "@/server/services/posts";
import { PUBLIC_TUTOR_SELECT } from "@/server/services/tutors";
import { getApplyViewer } from "@/server/viewer";
import { TuitionCard, TutorCard } from "@/components/Cards";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const { t, lang } = await getT();
  const [posts, tutors, stats] = await Promise.all([
    db.tuitionPost.findMany({ where: { status: { in: ["OPEN", "SHORTLISTED"] } }, orderBy: { createdAt: "desc" }, take: 6, select: PUBLIC_POST_SELECT }).catch(() => []),
    db.tutorProfile.findMany({ where: { verificationStatus: "VERIFIED", user: { isBlocked: false } }, orderBy: [{ ratingAvg: "desc" }, { completedTuitions: "desc" }], take: 3, select: PUBLIC_TUTOR_SELECT }).catch(() => []),
    Promise.all([db.tuitionPost.count({ where: { status: { in: ["OPEN", "SHORTLISTED"] } } }), db.tutorProfile.count({ where: { verificationStatus: "VERIFIED" } }), db.tuitionAgreement.count({ where: { status: { in: ["ACTIVE", "COMPLETED"] } } })]).catch(() => [0, 0, 0]),
  ]);
  const viewer = await getApplyViewer(posts.map((p) => p.id));

  const flow = [
    { icon: ListChecks, title: t("রিকোয়ারমেন্ট পোস্ট", "Post a requirement"), desc: t("বিষয়, শ্রেণি, কারিকুলাম, হোম/অনলাইন/ব্যাচ, বাজেট — ২ মিনিটে।", "Subjects, class, curriculum, home/online/batch, budget — in 2 minutes.") },
    { icon: BadgeCheck, title: t("যাচাইকৃত আবেদন", "Verified applicants"), desc: t("শুধু KYC-যাচাইকৃত শিক্ষকরাই কাস্টম পিচসহ আবেদন করতে পারেন।", "Only KYC-verified tutors can apply, each with a custom pitch.") },
    { icon: Video, title: t("শর্টলিস্ট ও ট্রায়াল", "Shortlist & trial"), desc: t("৫ জন পর্যন্ত শর্টলিস্ট, LMS লাইভ ক্লাস বা অটো মিট লিংকে ট্রায়াল।", "Shortlist up to 5, then a trial in the LMS live classroom or an auto meeting link.") },
    { icon: FileSignature, title: t("ডিজিটাল চুক্তি", "Digital agreement"), desc: t("দুই পক্ষের ই-স্বাক্ষরে নিয়োগ লক — শর্ত, বেতন, সার্ভিস চার্জ স্পষ্ট।", "Hire locks when both e-sign — terms, salary and service charge are explicit.") },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 size-[420px] rounded-full bg-accent/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 md:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /> {t("NID ও শিক্ষাগত ডকুমেন্ট যাচাইকৃত শিক্ষক", "NID & education-verified tutors")}</span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {t("সঠিক শিক্ষক, সঠিক চুক্তিতে —", "The right tutor, on the right terms —")} <span className="text-primary">{t("বাসায় বা অনলাইনে", "at home or online")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{t("টিউশন পোস্ট করুন, যাচাইকৃত আবেদনকারীদের তুলনা করুন, ট্রায়াল ক্লাস নিন আর ডিজিটাল চুক্তিতে নিয়োগ দিন। অনলাইন টিউশন চলে আপনার LMS ক্লাসরুম ও হোয়াইটবোর্ডে।", "Post a tuition, compare verified applicants, run a trial class and hire with a digital agreement. Online tuition runs inside your LMS classroom and whiteboard.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/post-tuition" className={buttonVariants({ variant: "accent", size: "lg" })}>{t("টিউশন পোস্ট করুন — ফ্রি", "Post a tuition — free")} <ArrowRight /></Link>
            <Link href="/tuitions" className={buttonVariants({ variant: "outline", size: "lg" })}>{t("আমি শিক্ষক — জব দেখুন", "I'm a tutor — see jobs")}</Link>
          </div>
          <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-4">
            {[[stats[0], t("খোলা টিউশন", "open tuitions")], [stats[1], t("যাচাইকৃত শিক্ষক", "verified tutors")], [stats[2], t("নিশ্চিত নিয়োগ", "confirmed hires")]].map(([n, l]) => (
              <div key={String(l)} className="rounded-2xl border border-border bg-card/70 p-4"><dt className="font-display text-2xl font-bold text-primary">{formatNumber(Number(n), lang)}</dt><dd className="mt-1 text-sm text-muted-foreground">{l}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-border bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("কীভাবে কাজ করে", "How it works")}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{t("পোস্ট থেকে নিয়োগ — চার ধাপে", "From post to hire in four steps")}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {flow.map((f, i) => (
              <Card key={f.title} className="p-5">
                <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><f.icon className="size-5" /></span><span className="font-display text-3xl font-bold text-border">{formatNumber(i + 1, lang)}</span></div>
                <p className="mt-4 font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Card className="flex gap-4 p-5"><Laptop className="size-6 shrink-0 text-primary" /><div><p className="font-semibold">{t("LMS-এর সাথে যুক্ত", "Built into your LMS")}</p><p className="mt-1 text-sm text-muted-foreground">{t("শিক্ষক কোর্স ভিডিও ও অ্যাসাইনমেন্ট শেয়ার করেন; শিক্ষার্থীর LMS পারফরম্যান্স সেশন লগের পাশেই দেখা যায়।", "Tutors share LMS courses and assignments; the student's LMS performance sits next to the session log.")}</p></div></Card>
            <Card className="flex gap-4 p-5"><Receipt className="size-6 shrink-0 text-primary" /><div><p className="font-semibold">{t("স্বচ্ছ সার্ভিস চার্জ", "Transparent service charge")}</p><p className="mt-1 text-sm text-muted-foreground">{t("চুক্তিতেই লেখা থাকে; স্বয়ংক্রিয় ইনভয়েস, bKash/Nagad/কার্ডে SSLCommerz দিয়ে পেমেন্ট।", "Written into the agreement; automatic invoices payable by bKash, Nagad or card via SSLCommerz.")}</p></div></Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("লাইভ জব", "Live jobs")}</p><h2 className="mt-2 font-display text-3xl font-bold">{t("সর্বশেষ টিউশন", "Latest tuitions")}</h2></div>
          <Link href="/tuitions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{t("সব দেখুন", "View all")} <ArrowRight className="size-4" /></Link>
        </div>
        {posts.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <TuitionCard key={p.id} post={p} lang={lang} viewer={viewer} />)}</div>
          : <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("এখনো কোনো খোলা টিউশন নেই — প্রথম পোস্টটি আপনার হোক!", "No open tuitions yet — be the first to post!")}</p>}
      </section>

      {tutors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("শিক্ষক", "Tutors")}</p><h2 className="mt-2 font-display text-3xl font-bold">{t("শীর্ষ যাচাইকৃত শিক্ষক", "Top verified tutors")}</h2></div>
            <Link href="/tutors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{t("সব দেখুন", "View all")} <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tutors.map((x) => <TutorCard key={x.id} tutor={x} lang={lang} />)}</div>
        </section>
      )}
    </>
  );
}
