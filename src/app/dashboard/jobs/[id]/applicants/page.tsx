import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, ExternalLink, GraduationCap, Star, Video } from "lucide-react";
import { CURRICULA, gradeLabel, locationLabel, subjectLabel } from "@/lib/catalog";
import { formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { getApplicantsForGuardian } from "@/server/services/applications";
import { cancelTuitionAction, trialOutcomeAction } from "@/server/actions/marketplace";
import { ApplicantActions } from "@/components/ApplicantActions";
import { initials } from "@/components/Cards";
import { ActionButton } from "@/components/FormBits";
import { Empty } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ApplicantsPage({ params, searchParams }: PageProps<"/dashboard/jobs/[id]/applicants">) {
  const [{ id }, sp, user, { t, lang }] = await Promise.all([params, searchParams, requireUser(["STUDENT_GUARDIAN"]), getT()]);
  const post = await getApplicantsForGuardian(user, id).catch((e) => { if (e instanceof DomainError) notFound(); throw e; });

  // ── Server-side filtering & sorting (university, department, rating, experience) ──
  const tab = one(sp.tab) ?? "all";
  const sort = one(sp.sort) ?? "rating";
  const uni = one(sp.uni)?.toLowerCase();
  let apps = post.applications.filter((a) => (tab === "all" ? a.status !== "REJECTED" : tab === "shortlisted" ? a.status === "SHORTLISTED" || a.status === "CONFIRMED" : tab === "rejected" ? a.status === "REJECTED" : a.status === "PENDING"));
  if (uni) apps = apps.filter((a) => `${a.tutorProfile.university} ${a.tutorProfile.department ?? ""}`.toLowerCase().includes(uni));
  apps = [...apps].sort((a, b) =>
    sort === "experience" ? b.tutorProfile.experienceYears - a.tutorProfile.experienceYears
    : sort === "newest" ? +b.createdAt - +a.createdAt
    : Number(b.tutorProfile.ratingAvg) - Number(a.tutorProfile.ratingAvg) || b.tutorProfile.completedTuitions - a.tutorProfile.completedTuitions);

  const shortlisted = post.applications.filter((a) => a.status === "SHORTLISTED" || a.status === "CONFIRMED");
  const live = post.agreements[0];
  const closed = post.status === "CONFIRMED" || post.status === "CANCELLED";
  const q = (patch: Record<string, string>) => `?${new URLSearchParams({ tab, sort, ...(uni ? { uni } : {}), ...patch })}`;
  const tabs = [["all", t("সব", "All")], ["pending", t("নতুন", "New")], ["shortlisted", t("শর্টলিস্ট", "Shortlist")], ["rejected", t("বাতিল", "Rejected")]];

  return (
    <>
      {one(sp.created) && <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{t("টিউশন পোস্ট হয়েছে! যাচাইকৃত শিক্ষকরা আবেদন করলে এখানে দেখবেন।", "Your tuition is live! Verified tutors' applications will appear here.")}</p>}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><StatusBadge status={post.status} lang={lang} /><span className="text-xs text-muted-foreground">#{formatNumber(post.number, lang)}</span></div>
            <h1 className="mt-1 font-display text-2xl font-bold">{post.title}</h1>
            <p className="text-sm text-muted-foreground">{gradeLabel(post.grade, lang)} · {CURRICULA[post.curriculum][lang]} · {post.subjects.map((s) => subjectLabel(s, lang)).join(", ")} · {locationLabel(post, lang)} · {formatMoney(String(post.budgetMax), lang)}{t("/মাস", "/mo")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">{t("শর্টলিস্ট", "Shortlist")} <b>{formatNumber(post.shortlistedCount, lang)}/{formatNumber(post.maxShortlist, lang)}</b></p>
            <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(post.shortlistedCount / post.maxShortlist) * 100}%` }} /></div>
            {!closed && !live && <div className="mt-3"><ActionButton action={cancelTuitionAction} fields={{ postId: post.id }} size="sm" variant="ghost" confirm={t("পোস্টটি বাতিল করবেন?", "Cancel this tuition post?")}>{t("পোস্ট বাতিল", "Cancel post")}</ActionButton></div>}
          </div>
        </div>
        {live && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <span>{live.status === "ACTIVE" ? t("নিয়োগ সম্পন্ন — চুক্তি সক্রিয়।", "Hire confirmed — the agreement is active.") : t("চুক্তি তৈরি হয়েছে, শিক্ষকের স্বাক্ষরের অপেক্ষা।", "Agreement generated — waiting for the tutor's signature.")}</span>
            <Link href={live.status === "ACTIVE" ? `/dashboard/tuitions/${live.id}` : `/dashboard/agreements/${live.id}`} className={buttonVariants({ size: "sm" })}>{t("চুক্তি দেখুন", "View agreement")}</Link>
          </div>
        )}
      </Card>

      {/* ── Side-by-side comparison of shortlisted tutors ── */}
      {shortlisted.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <h2 className="border-b border-border px-5 py-3 font-bold">{t("শর্টলিস্ট তুলনা", "Shortlist comparison")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>{[t("শিক্ষক", "Tutor"), t("শিক্ষা", "Education"), t("অভিজ্ঞতা", "Experience"), t("রেটিং", "Rating"), t("প্রস্তাবিত সম্মানী", "Asks"), t("ট্রায়াল", "Trial")].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shortlisted.map((a) => {
                  const tp = a.tutorProfile; const trial = a.trials[0];
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-semibold"><span className="flex items-center gap-1">{tp.user.fullName}{tp.verificationStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" />}</span></td>
                      <td className="px-4 py-3">{tp.university}<div className="text-xs text-muted-foreground">{[tp.department, tp.degree].filter(Boolean).join(" · ")}</div></td>
                      <td className="px-4 py-3">{formatNumber(tp.experienceYears, lang)} {t("বছর", "yrs")} · {formatNumber(tp.completedTuitions, lang)} {t("টিউশন", "tuitions")}</td>
                      <td className="px-4 py-3">★ {formatNumber(Number(tp.ratingAvg).toFixed(1), lang)} <span className="text-muted-foreground">({formatNumber(tp.ratingCount, lang)})</span></td>
                      <td className="px-4 py-3">{a.proposedSalary ? formatMoney(String(a.proposedSalary), lang) : "—"}</td>
                      <td className="px-4 py-3">{trial ? <StatusBadge status={trial.status} lang={lang} /> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Filters ── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {tabs.map(([k, l]) => <Link key={k} href={q({ tab: k })} className={cn("rounded-full px-3 py-1.5 text-sm", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</Link>)}
        </div>
        <form className="flex flex-wrap gap-2 text-sm">
          <input type="hidden" name="tab" value={tab} />
          <input name="uni" defaultValue={uni} placeholder={t("বিশ্ববিদ্যালয় / বিভাগ", "University / department")} className="h-9 rounded-full border border-border bg-card px-3" />
          <select name="sort" defaultValue={sort} className="h-9 rounded-full border border-border bg-card px-3">
            <option value="rating">{t("রেটিং অনুযায়ী", "Top rated")}</option><option value="experience">{t("অভিজ্ঞতা অনুযায়ী", "Most experienced")}</option><option value="newest">{t("নতুন আগে", "Newest")}</option>
          </select>
          <button className={buttonVariants({ size: "sm", variant: "outline" })}>{t("প্রয়োগ", "Apply")}</button>
        </form>
      </div>

      {/* ── Applicant cards ── */}
      <div className="mt-4 space-y-4">
        {apps.length === 0 ? <Empty>{t("এই তালিকায় কেউ নেই।", "Nobody here yet.")}</Empty> : apps.map((a) => {
          const tp = a.tutorProfile;
          return (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className={`grid size-12 shrink-0 place-items-center rounded-full font-display font-bold ${tp.gender === "FEMALE" ? "bg-accent/20 text-accent-foreground" : "bg-primary/15 text-primary"}`}>{initials(tp.user.fullName)}</div>
                  <div className="min-w-0">
                    <Link href={`/tutors/${tp.id}`} className="flex flex-wrap items-center gap-1.5 font-bold hover:text-primary">{tp.user.fullName}{tp.verificationStatus === "VERIFIED" && <Badge variant="verified"><BadgeCheck /> {t("যাচাইকৃত", "Verified")}</Badge>}</Link>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><GraduationCap className="size-4" /> {tp.university}{tp.department ? ` · ${tp.department}` : ""}{tp.currentlyStudying ? t(" (অধ্যয়নরত)", " (studying)") : ""}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-4 fill-accent text-accent" /> {formatNumber(Number(tp.ratingAvg).toFixed(1), lang)} · {formatNumber(tp.experienceYears, lang)} {t("বছর অভিজ্ঞতা", "yrs experience")} · {t("আবেদন", "applied")} {timeAgo(a.createdAt, lang)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={a.status} lang={lang} />
                  {a.proposedSalary && <span className="text-sm font-semibold text-primary">{formatMoney(String(a.proposedSalary), lang)}{t("/মাস", "/mo")}</span>}
                </div>
              </div>
              <blockquote className="mt-4 whitespace-pre-line rounded-xl bg-muted/50 p-4 text-sm">{a.coverNote}</blockquote>
              {a.availability && <p className="mt-2 text-xs text-muted-foreground">{t("সময়", "Availability")}: {a.availability}</p>}

              {a.trials.map((tr) => (
                <div key={tr.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /> {t("ট্রায়াল", "Trial")}: {formatDate(tr.scheduledAt, lang, { dateStyle: "medium", timeStyle: "short" })} · {formatNumber(tr.durationMinutes, lang)}{t(" মিনিট", " min")} <StatusBadge status={tr.status} lang={lang} /></span>
                  <span className="flex items-center gap-2">
                    {tr.meetingLink && tr.status === "SCHEDULED" && <a href={tr.meetingLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}><Video /> {t("যোগ দিন", "Join")} <ExternalLink /></a>}
                    {tr.status === "SCHEDULED" && <>
                      <ActionButton action={trialOutcomeAction} fields={{ trialId: tr.id, status: "COMPLETED", postId: post.id }} size="sm" variant="ghost">{t("সম্পন্ন", "Done")}</ActionButton>
                      <ActionButton action={trialOutcomeAction} fields={{ trialId: tr.id, status: "NO_SHOW", postId: post.id }} size="sm" variant="ghost">{t("আসেননি", "No-show")}</ActionButton>
                    </>}
                  </span>
                </div>
              ))}

              {!closed && (
                <div className="mt-4 border-t border-border pt-4">
                  <ApplicantActions applicationId={a.id} postId={post.id} status={a.status} tutorName={tp.user.fullName} guardianName={user.fullName}
                    canShortlist={post.shortlistedCount < post.maxShortlist} hireLocked={!!live}
                    defaults={{ salary: Number(a.proposedSalary ?? post.budgetMax), days: post.daysPerWeek, minutes: post.sessionMinutes, online: post.isOnline }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
