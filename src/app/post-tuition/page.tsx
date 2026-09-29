import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { getSessionUser } from "@/server/auth";
import { PostTuitionForm } from "@/components/PostTuitionForm";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Post a tuition" };

export default async function PostTuitionPage() {
  const [{ t }, user] = await Promise.all([getT(), getSessionUser()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">{t("টিউশন পোস্ট করুন", "Post a tuition requirement")}</h1>
      <p className="mt-2 text-muted-foreground">{t("পোস্ট করা ফ্রি। যাচাইকৃত শিক্ষকরা আবেদন করবেন; আপনি তুলনা করে ৫ জন পর্যন্ত শর্টলিস্ট করবেন।", "Posting is free. Verified tutors apply; you compare them and shortlist up to 5.")}</p>
      <div className="mt-8">
        {!user ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-semibold">{t("পোস্ট করতে অভিভাবক অ্যাকাউন্টে লগইন করুন।", "Log in with a guardian account to post.")}</p>
            <div className="mt-4 flex justify-center gap-2"><Link href="/login?next=/post-tuition" className={buttonVariants()}>{t("লগইন", "Log in")}</Link><Link href="/signup?next=/post-tuition" className={buttonVariants({ variant: "outline" })}>{t("অ্যাকাউন্ট খুলুন", "Sign up")}</Link></div>
          </div>
        ) : user.role !== "STUDENT_GUARDIAN" ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">{t("শুধু অভিভাবক/শিক্ষার্থী অ্যাকাউন্ট থেকে টিউশন পোস্ট করা যায়।", "Only guardian/student accounts can post tuitions.")}</p>
        ) : (
          <PostTuitionForm defaultPhone={user.phone} />
        )}
      </div>
    </div>
  );
}
