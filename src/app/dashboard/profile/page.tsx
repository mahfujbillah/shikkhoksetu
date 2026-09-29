import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { getMyTutorProfile } from "@/server/services/tutors";
import { saveContactAction } from "@/server/actions/account";
import { ActionForm, Field, SubmitButton } from "@/components/FormBits";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ProfilePage({ searchParams }: PageProps<"/dashboard/profile">) {
  const user = await requireUser();
  const { t, lang } = await getT();
  const sp = await searchParams;

  if (user.role !== "TUTOR") {
    return (
      <>
        <PageHeader title={t("যোগাযোগের তথ্য", "Contact details")} desc={t("নিয়োগ নিশ্চিত হলে শুধু নিয়োগপ্রাপ্ত শিক্ষক আপনার ফোন নম্বর দেখবেন।", "Only the tutor you hire can see your phone number, after the agreement is signed.")} />
        <Card className="max-w-xl p-6">
          <ActionForm action={saveContactAction} className="space-y-4">
            {(s) => (<>
              <Field label={t("পূর্ণ নাম (চুক্তিতে স্বাক্ষরের নাম)", "Full name (used to sign agreements)")} name="fullName" state={s}><Input name="fullName" defaultValue={user.fullName} required /></Field>
              <Field label={t("মোবাইল", "Mobile")} name="phone" state={s}><Input name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="01XXXXXXXXX" required /></Field>
              <SubmitButton>{t("সংরক্ষণ", "Save")}</SubmitButton>
            </>)}
          </ActionForm>
        </Card>
      </>
    );
  }

  const p = await getMyTutorProfile(user.id);
  return (
    <>
      {sp.welcome && <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("স্বাগতম! প্রোফাইল পূরণ করে KYC জমা দিলেই জবে আবেদন করতে পারবেন।", "Welcome! Complete your profile, then submit KYC to start applying.")}</p>}
      <PageHeader title={t("শিক্ষক প্রোফাইল", "Tutor profile")} desc={t("অভিভাবকরা এই তথ্য দেখে শর্টলিস্ট করেন।", "Guardians shortlist based on this information.")}>
        {p && <div className="flex items-center gap-2"><StatusBadge status={p.verificationStatus} lang={lang} /><Link href={`/tutors/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("পাবলিক প্রোফাইল", "Public profile")}</Link></div>}
      </PageHeader>
      <TutorProfileForm d={{
        fullName: user.fullName, phone: user.phone ?? "", gender: p?.gender, headline: p?.headline ?? undefined, bio: p?.bio ?? undefined, university: p?.university,
        department: p?.department ?? undefined, degree: p?.degree ?? undefined, graduationYear: p?.graduationYear ?? undefined, currentlyStudying: p?.currentlyStudying ?? true,
        experienceYears: p?.experienceYears, monthlyRate: p?.monthlyRate ? Number(p.monthlyRate) : undefined, hourlyRate: p?.hourlyRate ? Number(p.hourlyRate) : undefined,
        subjects: p?.subjects ?? [], grades: p?.grades ?? [], curricula: p?.curricula ?? [], tuitionTypes: p?.tuitionTypes ?? [], preferredCities: p?.preferredCities ?? [],
        preferredAreas: p?.preferredAreas ?? [], maxDaysPerWeek: p?.maxDaysPerWeek ?? undefined,
      }} />
    </>
  );
}
