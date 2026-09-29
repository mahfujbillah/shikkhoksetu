/**
 * End-to-end workflow + concurrency test against a real Postgres.
 * Run: npx tsx --conditions=react-server scripts/test-workflow.ts
 */
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { createTuitionPost, listOpenTuitions } from "@/server/services/posts";
import { MAX_APPLICANTS } from "@/lib/catalog";
import { parseBoardParams, toBoardQuery } from "@/lib/board-params";
import { applyToTuition, shortlistApplicant, withdrawApplication } from "@/server/services/applications";
import { hireAndGenerateAgreement, scheduleTrial, signAgreementAsTutor } from "@/server/services/hiring";
import { recordManualPayment, settleInvoice } from "@/server/services/billing";
import { addReview, confirmSession, logSession } from "@/server/services/engagement";
import { grantCredits, updateSettings } from "@/server/services/admin";
import { recordKycDocument, reviewKycDocument, setTutorVerification, submitForVerification, upsertTutorProfile } from "@/server/services/tutors";

let passed = 0;
function check(cond: unknown, label: string) {
  if (!cond) { console.error("✗ FAIL:", label); process.exitCode = 1; }
  else { passed++; console.log("✓", label); }
}
const code = (e: unknown) => (e instanceof DomainError ? e.code : `UNEXPECTED ${(e as Error).message}`);

async function mkUser(role: SessionUser["role"], name: string, extra: Partial<SessionUser> = {}): Promise<SessionUser> {
  const id = randomUUID();
  await db.user.create({ data: { id, email: `${name.toLowerCase().replace(/\s/g, "")}-${id.slice(0, 4)}@test.bd`, fullName: name, role, isSuperAdmin: !!extra.isSuperAdmin } });
  return { id, email: "", fullName: name, phone: null, role, isSuperAdmin: !!extra.isSuperAdmin, isBlocked: false, tutorProfileId: null };
}

async function mkTutor(name: string, gender: "MALE" | "FEMALE", admin: SessionUser, verify = true) {
  const u = await mkUser("TUTOR", name);
  const p = await upsertTutorProfile(u, {
    fullName: name, phone: "01711111111", gender, university: "BUET", department: "EEE", subjects: ["PHYSICS", "MATH"], grades: ["SSC"],
    curricula: ["BANGLA_MEDIUM"], tuitionTypes: ["HOME"], preferredCities: ["DHAKA"], preferredAreas: ["MIRPUR"], currentlyStudying: true, experienceYears: 2,
  });
  u.tutorProfileId = p.id;
  if (verify) {
    const nid = await recordKycDocument(u, { type: "NID", storagePath: `${u.id}/nid.jpg`, fileName: "nid.jpg", mimeType: "image/jpeg", sizeBytes: 1000 });
    const sid = await recordKycDocument(u, { type: "STUDENT_ID", storagePath: `${u.id}/sid.jpg`, fileName: "sid.jpg", mimeType: "image/jpeg", sizeBytes: 1000 });
    await submitForVerification(u);
    await reviewKycDocument(admin, nid.id, true);
    await reviewKycDocument(admin, sid.id, true);
    await setTutorVerification(admin, p.id, "VERIFIED");
  }
  return u;
}

const pitch = "I am a BUET EEE student with two years of experience teaching SSC Physics and Math to Bangla medium students in Mirpur.";

async function main() {
  await db.$executeRawUnsafe(`TRUNCATE "users" CASCADE`);
  await db.platformSetting.upsert({ where: { id: 1 }, update: { monetizationMode: "COMMISSION", commissionRate: 50, maxShortlist: 5 }, create: { id: 1 } });

  const admin = await mkUser("ADMIN", "Mahfuj Billah", { isSuperAdmin: true });
  const guardian = await mkUser("STUDENT_GUARDIAN", "Rezaul Karim");

  // KYC guard: verification without an education document is refused
  const lazy = await mkTutor("Lazy Tutor", "MALE", admin, false);
  await recordKycDocument(lazy, { type: "NID", storagePath: `${lazy.id}/nid.jpg`, fileName: "n.jpg", mimeType: "image/jpeg", sizeBytes: 10 });
  check(await submitForVerification(lazy).then(() => "ok", code) === "KYC_INCOMPLETE", "KYC: submit without education doc → KYC_INCOMPLETE");
  check(await recordKycDocument(lazy, { type: "PHOTO", storagePath: `someone-else/x.jpg`, fileName: "x", mimeType: "image/jpeg", sizeBytes: 1 }).then(() => "ok", code) === "FORBIDDEN", "KYC: storage path outside own folder → FORBIDDEN");

  const tutors: SessionUser[] = [];
  for (let i = 1; i <= 7; i++) tutors.push(await mkTutor(`Tutor ${i}`, i === 7 ? "FEMALE" : "MALE", admin));

  const post = await createTuitionPost(guardian, {
    title: "SSC Physics & Math tutor needed in Mirpur", grade: "SSC", curriculum: "BANGLA_MEDIUM", subjects: ["PHYSICS", "MATH"], tuitionType: "HOME",
    daysPerWeek: 4, sessionMinutes: 90, budgetMax: 8000, budgetMin: 6000, salaryNegotiable: true, genderPreference: "MALE", city: "DHAKA", area: "MIRPUR",
    addressLine: "House 12, Road 3, Mirpur 10", studentsCount: 1, phone: "01811111111",
  });
  check(post.number > 0, `Guardian posted tuition #${post.number}`);

  // Guard: unverified tutor
  check(await applyToTuition(lazy, { postId: post.id, coverNote: pitch }).then(() => "ok", code) === "TUTOR_NOT_VERIFIED", "Unverified tutor cannot apply");
  // Guard: gender preference
  check(await applyToTuition(tutors[6], { postId: post.id, coverNote: pitch }).then(() => "ok", code) === "GENDER_MISMATCH", "Gender preference enforced");

  // Concurrency: 5 simultaneous submits from the same tutor
  const burst = await Promise.all(Array.from({ length: 5 }, () => applyToTuition(tutors[0], { postId: post.id, coverNote: pitch }).then(() => "ok", code)));
  check(burst.filter((r) => r === "ok").length === 1 && burst.filter((r) => r === "DUPLICATE_APPLICATION").length === 4, `Double-submit race → exactly 1 application (${burst.join(", ")})`);

  for (const t of tutors.slice(1, 6)) await applyToTuition(t, { postId: post.id, coverNote: pitch, proposedSalary: 7000 });
  const p1 = await db.tuitionPost.findUniqueOrThrow({ where: { id: post.id } });
  check(p1.applicationsCount === 6, `applicationsCount is exact (${p1.applicationsCount})`);

  // Concurrency: shortlist all 6 at once with a cap of 5
  const apps = await db.tuitionApplication.findMany({ where: { postId: post.id }, orderBy: { createdAt: "asc" } });
  const sl = await Promise.all(apps.map((a) => shortlistApplicant(guardian, a.id).then(() => "ok", code)));
  const p2 = await db.tuitionPost.findUniqueOrThrow({ where: { id: post.id } });
  check(sl.filter((r) => r === "ok").length === 5 && sl.includes("SHORTLIST_FULL") && p2.shortlistedCount === 5 && p2.status === "SHORTLISTED", `Shortlist race respects max 5 (${sl.join(", ")})`);

  // Withdraw frees a slot
  const shortlisted = await db.tuitionApplication.findMany({ where: { postId: post.id, status: "SHORTLISTED" }, include: { tutorProfile: true } });
  const leaver = tutors.find((t) => t.tutorProfileId === shortlisted[4].tutorProfileId)!;
  await withdrawApplication(leaver, shortlisted[4].id);
  check((await db.tuitionPost.findUniqueOrThrow({ where: { id: post.id } })).shortlistedCount === 4, "Withdrawing a shortlisted application frees the slot");
  check((await db.tuitionPost.findUniqueOrThrow({ where: { id: post.id } })).applicationsCount === 5, "Withdrawal lowers the live applicant count (6 → 5)");

  // Only the owner can shortlist
  const stranger = await mkUser("STUDENT_GUARDIAN", "Stranger");
  check(await shortlistApplicant(stranger, apps[0].id).then(() => "ok", code) === "FORBIDDEN", "Another guardian cannot shortlist");

  // Trial
  const [a1, a2] = shortlisted;
  const trial = await scheduleTrial(guardian, { applicationId: a1.id, scheduledAt: new Date(Date.now() + 86_400_000), durationMinutes: 45, mode: "ONLINE_MEET", isPaid: true, fee: 500 });
  check(trial.meetingLink?.startsWith("https://meet.jit.si/"), `Trial scheduled with auto meeting link ${trial.meetingLink}`);
  check((await db.invoice.count({ where: { trialSessionId: trial.id, type: "TRIAL_FEE" } })) === 1, "Paid trial generated a guardian invoice");

  // Concurrency: two hires at the same instant
  const hireInput = (applicationId: string) => ({ applicationId, monthlySalary: 7000, startDate: new Date(), daysPerWeek: 4, sessionMinutes: 90, signature: "Rezaul Karim", consent: true as const });
  const hires = await Promise.all([hireAndGenerateAgreement(guardian, hireInput(a1.id), "1.1.1.1").then((r) => r, code), hireAndGenerateAgreement(guardian, hireInput(a2.id), "1.1.1.1").then((r) => r, code)]);
  const won = hires.find((h) => typeof h === "object") as { id: string } | undefined;
  check(won && hires.includes("ALREADY_HIRING"), `Double-hire race → one agreement, other ALREADY_HIRING`);
  check(await hireAndGenerateAgreement(guardian, { ...hireInput(a2.id), signature: "Wrong Name" }, null).then(() => "ok", code) === "SIGNATURE_REQUIRED", "Signature must match account name");

  const ag = await db.tuitionAgreement.findUniqueOrThrow({ where: { id: won!.id }, include: { tutorProfile: true } });
  check(!ag.terms.includes("House 12"), "Private address is not in the signed text");
  const hiredTutor = tutors.find((t) => t.tutorProfileId === ag.tutorProfileId)!;
  const other = tutors.find((t) => t.tutorProfileId !== ag.tutorProfileId)!;
  check(await signAgreementAsTutor(other, ag.id, other.fullName, null).then(() => "ok", code) === "FORBIDDEN", "Wrong tutor cannot sign");
  await signAgreementAsTutor(hiredTutor, ag.id, hiredTutor.fullName, "2.2.2.2");
  check(await signAgreementAsTutor(hiredTutor, ag.id, hiredTutor.fullName, null).then(() => "ok", code) === "INVALID_STATE", "Signing twice is rejected");

  const p3 = await db.tuitionPost.findUniqueOrThrow({ where: { id: post.id }, include: { applications: true } });
  check(p3.status === "CONFIRMED", "Job → CONFIRMED after both signatures");
  check(p3.applications.filter((a) => a.status === "CONFIRMED").length === 1 && p3.applications.filter((a) => a.status === "REJECTED").length >= 4, "Hired app CONFIRMED, others auto-REJECTED");
  const inv = await db.invoice.findFirstOrThrow({ where: { agreementId: ag.id, type: "PLATFORM_COMMISSION" } });
  check(Number(inv.amount) === 3500 && inv.billedToId === hiredTutor.id, `Commission invoice ${inv.invoiceNumber} = ৳${inv.amount} billed to tutor`);

  // Late application is refused
  check(await applyToTuition(tutors[5], { postId: post.id, coverNote: pitch }).then(() => "ok", code) !== "ok", "Cannot apply to a CONFIRMED job");

  // Payment settlement is idempotent
  await recordManualPayment(admin, inv.id, "bKash TXN 8AB12");
  const t2 = await db.paymentTransaction.create({ data: { invoiceId: inv.id, provider: "SSLCOMMERZ", tranId: "DUP-1", amount: inv.amount, currency: "BDT" } });
  const again = await db.$transaction((tx) => settleInvoice(tx, inv.id, t2.id));
  check(again === false && (await db.tuitionAgreement.findUniqueOrThrow({ where: { id: ag.id } })).paymentStatus === "PAID", "Invoice settles once; replayed webhook is a no-op");

  // Attendance + review
  const s = await logSession(hiredTutor, { agreementId: ag.id, date: new Date(), durationMinutes: 90, status: "COMPLETED", topicsCovered: "Newton's laws" });
  check(await logSession(hiredTutor, { agreementId: ag.id, date: new Date(), durationMinutes: 90, status: "COMPLETED" }).then(() => "ok", code) === "VALIDATION", "Only one session log per day");
  await confirmSession(guardian, s.id, "Great class", 5);
  await addReview(guardian, ag.id, 5, "Excellent tutor");
  check(await addReview(guardian, ag.id, 4).then(() => "ok", code) === "VALIDATION", "One review per engagement");
  const tp = await db.tutorProfile.findUniqueOrThrow({ where: { id: ag.tutorProfileId } });
  check(Number(tp.ratingAvg) === 5 && tp.ratingCount === 1, "Tutor rating aggregate updated");

  // Credits monetisation
  await updateSettings(admin, { monetizationMode: "CREDITS", commissionRate: 0, commissionPayer: "TUTOR", applyCreditCost: 2, maxShortlist: 5, invoiceDueDays: 7 });
  const post2 = await createTuitionPost(guardian, { title: "Online HSC Chemistry help", grade: "HSC", curriculum: "BANGLA_MEDIUM", subjects: ["CHEMISTRY"], tuitionType: "ONLINE_ONE_TO_ONE", daysPerWeek: 3, sessionMinutes: 60, budgetMax: 5000, salaryNegotiable: false, genderPreference: "ANY", studentsCount: 1, phone: "01811111111" });
  const t3 = tutors[2];
  check(await applyToTuition(t3, { postId: post2.id, coverNote: pitch }).then(() => "ok", code) === "INSUFFICIENT_CREDITS", "Credits mode: 0 credits → INSUFFICIENT_CREDITS");
  check((await db.tuitionApplication.count({ where: { postId: post2.id } })) === 0, "…and no application row was left behind (rolled back)");
  await grantCredits(admin, t3.tutorProfileId!, 3);
  await applyToTuition(t3, { postId: post2.id, coverNote: pitch });
  check((await db.tutorProfile.findUniqueOrThrow({ where: { id: t3.tutorProfileId! } })).creditBalance === 1, "Credits deducted exactly once (3 → 1)");

  // Applicant cap: 12 tutors race for 10 slots on one job
  await updateSettings(admin, { monetizationMode: "COMMISSION", commissionRate: 50, commissionPayer: "TUTOR", applyCreditCost: 1, maxShortlist: 5, invoiceDueDays: 7 });
  const capPost = await createTuitionPost(guardian, { title: "Class 8 Math tutor wanted in Dhanmondi", grade: "CLASS_6_8", curriculum: "ENGLISH_VERSION", subjects: ["MATH"], tuitionType: "HOME", daysPerWeek: 3, sessionMinutes: 60, budgetMax: 6000, salaryNegotiable: false, genderPreference: "ANY", city: "DHAKA", area: "DHANMONDI", studentsCount: 1, phone: "01811111111" });
  const racers: SessionUser[] = [];
  for (let i = 0; i < 12; i++) racers.push(await mkTutor(`Racer ${i}`, "MALE", admin));
  const race = await Promise.all(racers.map((r) => applyToTuition(r, { postId: capPost.id, coverNote: pitch }).then(() => "ok", code)));
  const cp = await db.tuitionPost.findUniqueOrThrow({ where: { id: capPost.id } });
  check(race.filter((r) => r === "ok").length === MAX_APPLICANTS && race.filter((r) => r === "APPLICATIONS_FULL").length === 2 && cp.applicationsCount === MAX_APPLICANTS, `Applicant cap race → exactly ${MAX_APPLICANTS} applications, 2 × APPLICATIONS_FULL`);

  // Board: hierarchical filters + URL round-trip + server-side pagination (10 per page)
  const f = parseBoardParams(new URLSearchParams("city=dhaka&area=dhanmondi&medium=english-version&grade=class-6-8"));
  check(f.city === "DHAKA" && f.area === "DHANMONDI" && f.medium === "ENGLISH_VERSION" && f.grade === "CLASS_6_8" && toBoardQuery(f) === "city=dhaka&area=dhanmondi&medium=english-version&grade=class-6-8", "Board URL params parse case-insensitively and round-trip canonically");
  const broken = parseBoardParams(new URLSearchParams("city=chattogram&area=mirpur&medium=bangla&curriculum=english-medium-edexcel&grade=o-level"));
  check(broken.city === "CHATTOGRAM" && !broken.area && broken.medium === "BANGLA" && !broken.curriculum && !broken.grade, "Broken chains are dropped (area ∉ city, board/class ∉ medium)");
  check((await listOpenTuitions(f)).items.some((p) => p.id === capPost.id) && (await listOpenTuitions({ city: "DHAKA", area: "MIRPUR", medium: "ENGLISH_VERSION" })).items.length === 0, "City → Area and Medium filters narrow the board");
  const em = await listOpenTuitions({ medium: "ENGLISH_MEDIUM" });
  check(em.total === 0, "Medium filter matches only its curricula");
  for (let i = 0; i < 11; i++) await createTuitionPost(guardian, { title: `Paging test tuition number ${i}`, grade: "SSC", curriculum: "BANGLA_MEDIUM", subjects: ["MATH"], tuitionType: "ONLINE_ONE_TO_ONE", daysPerWeek: 2, sessionMinutes: 60, budgetMax: 4000, salaryNegotiable: false, genderPreference: "ANY", studentsCount: 1, phone: "01811111111" });
  const pg1 = await listOpenTuitions({ online: true });
  const pg2 = await listOpenTuitions({ online: true, page: 2 });
  const pg99 = await listOpenTuitions({ online: true, page: 99 });
  check(pg1.items.length === 10 && pg1.pages === 2 && pg2.items.length === pg1.total - 10 && !pg2.items.some((x) => pg1.items.some((y) => y.id === x.id)) && pg99.page === 2, `Pagination: 10 per page, disjoint pages, ?page=99 clamps to last (${pg1.total} online jobs)`);

  console.log(`\n${passed} checks passed${process.exitCode ? " — WITH FAILURES" : ""}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
