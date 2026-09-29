/** Local demo data for visual QA. Run: npx tsx --conditions=react-server --env-file=.env scripts/seed-demo.ts */
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/server/auth";
import { createTuitionPost } from "@/server/services/posts";
import { applyToTuition, shortlistApplicant } from "@/server/services/applications";
import { hireAndGenerateAgreement, scheduleTrial, signAgreementAsTutor } from "@/server/services/hiring";
import { logSession, shareLmsResource } from "@/server/services/engagement";
import { recordKycDocument, reviewKycDocument, setTutorVerification, submitForVerification, upsertTutorProfile } from "@/server/services/tutors";

async function user(role: SessionUser["role"], name: string, email: string, sup = false): Promise<SessionUser> {
  const id = randomUUID();
  await db.user.create({ data: { id, email, fullName: name, role, isSuperAdmin: sup, phone: "01712345678" } });
  return { id, email, fullName: name, phone: "01712345678", role, isSuperAdmin: sup, isBlocked: false, tutorProfileId: null };
}

const tutorsSpec = [
  ["Tanvir Ahmed", "MALE", "BUET", "EEE", 4, ["PHYSICS", "MATH", "HIGHER_MATH"], 4.9],
  ["Nusrat Jahan", "FEMALE", "University of Dhaka", "English", 3, ["ENGLISH", "BANGLA"], 4.8],
  ["Mahmudul Hasan", "MALE", "Jahangirnagar University", "Chemistry", 5, ["CHEMISTRY", "BIOLOGY"], 4.7],
  ["Hafeza Sumaiya", "FEMALE", "Jamia Rahmania", "Quran & Arabic", 6, ["QURAN", "ARABIC"], 5.0],
  ["Rafi Islam", "MALE", "North South University", "CSE", 2, ["MATH", "ICT", "PROGRAMMING"], 4.6],
  ["Farhana Akter", "FEMALE", "Eden Mohila College", "Accounting", 3, ["ACCOUNTING", "FINANCE", "BUSINESS"], 4.5],
] as const;

async function main() {
  await db.$executeRawUnsafe(`TRUNCATE "users" CASCADE`);
  await db.platformSetting.upsert({ where: { id: 1 }, update: { monetizationMode: "COMMISSION", commissionRate: 50, maxShortlist: 5 }, create: { id: 1 } });
  const admin = await user("ADMIN", "mahfuj billah", "mahfuj@assunnahfoundation.org", true);
  const g = await user("STUDENT_GUARDIAN", "Rezaul Karim Emon", "emon@example.com");
  const g2 = await user("STUDENT_GUARDIAN", "Shahana Parvin", "shahana@example.com");

  const tutors: SessionUser[] = [];
  for (const [name, gender, uni, dept, exp, subjects, rating] of tutorsSpec) {
    const u = await user("TUTOR", name, `${name.split(" ")[0].toLowerCase()}@example.com`);
    const p = await upsertTutorProfile(u, { fullName: name, phone: "01812345678", gender, university: uni, department: dept, degree: `BSc in ${dept}`, headline: `${uni} · ${dept} · ${exp} yrs teaching`, bio: `I have been teaching for ${exp} years with a focus on concepts, regular tests and weekly progress notes for parents.`, subjects: [...subjects], grades: ["SSC", "HSC", "O_LEVEL"], curricula: ["BANGLA_MEDIUM", "ENGLISH_VERSION", "ENGLISH_MEDIUM_CAMBRIDGE"], tuitionTypes: ["HOME", "ONLINE_ONE_TO_ONE"], preferredCities: ["DHAKA"], preferredAreas: ["MIRPUR", "DHANMONDI", "UTTARA"], currentlyStudying: false, experienceYears: exp, monthlyRate: 6000 });
    u.tutorProfileId = p.id;
    const a = await recordKycDocument(u, { type: "NID", storagePath: `${u.id}/nid.jpg`, fileName: "nid.jpg", mimeType: "image/jpeg", sizeBytes: 90000 });
    const b = await recordKycDocument(u, { type: "STUDENT_ID", storagePath: `${u.id}/sid.jpg`, fileName: "student-id.jpg", mimeType: "image/jpeg", sizeBytes: 80000 });
    await submitForVerification(u); await reviewKycDocument(admin, a.id, true); await reviewKycDocument(admin, b.id, true); await setTutorVerification(admin, p.id, "VERIFIED");
    await db.tutorProfile.update({ where: { id: p.id }, data: { ratingAvg: rating, ratingCount: Math.round(exp * 7), completedTuitions: exp * 3 } });
    tutors.push(u);
  }
  // A tutor waiting in the KYC queue
  const pend = await user("TUTOR", "Sabbir Hossain", "sabbir@example.com");
  await upsertTutorProfile(pend, { fullName: "Sabbir Hossain", phone: "01912345678", gender: "MALE", university: "Rajshahi University", department: "Physics", subjects: ["PHYSICS"], grades: ["SSC"], curricula: ["BANGLA_MEDIUM"], tuitionTypes: ["HOME"], preferredCities: ["RAJSHAHI"], preferredAreas: [], currentlyStudying: true, experienceYears: 1 });
  await recordKycDocument(pend, { type: "NID", storagePath: `${pend.id}/nid.jpg`, fileName: "nid-front.jpg", mimeType: "image/jpeg", sizeBytes: 90000 });
  await recordKycDocument(pend, { type: "EDUCATIONAL_CERTIFICATE", storagePath: `${pend.id}/hsc.pdf`, fileName: "hsc-certificate.pdf", mimeType: "application/pdf", sizeBytes: 190000 });
  await submitForVerification(pend);

  const base = { studentsCount: 1, salaryNegotiable: true, genderPreference: "ANY" as const, phone: "01812345678", sessionMinutes: 60 };
  const main = await createTuitionPost(g, { ...base, title: "SSC Physics & Higher Math tutor needed — Mirpur 10", grade: "SSC", curriculum: "BANGLA_MEDIUM", subjects: ["PHYSICS", "HIGHER_MATH"], tuitionType: "HOME", daysPerWeek: 4, sessionMinutes: 90, budgetMin: 6000, budgetMax: 8000, city: "DHAKA", area: "MIRPUR", addressLine: "House 12, Road 3, Section 10", requirements: "Board exam in March. Needs help with numericals and creative questions. Weekly test preferred." });
  await createTuitionPost(g2, { ...base, title: "O Level Chemistry (Cambridge) — online 1-on-1", grade: "O_LEVEL", curriculum: "ENGLISH_MEDIUM_CAMBRIDGE", subjects: ["CHEMISTRY"], tuitionType: "ONLINE_ONE_TO_ONE", daysPerWeek: 3, budgetMax: 12000, genderPreference: "FEMALE" });
  await createTuitionPost(g2, { ...base, title: "Quran recitation (Tajweed) for two kids", grade: "QURAN_ARABIC", curriculum: "MADRASAH_QAWMI", subjects: ["QURAN", "ARABIC"], tuitionType: "GROUP_BATCH", studentsCount: 2, daysPerWeek: 5, budgetMax: 4000, city: "DHAKA", area: "UTTARA" });
  await createTuitionPost(g, { ...base, title: "HSC ICT & Programming basics", grade: "HSC", curriculum: "BANGLA_MEDIUM", subjects: ["ICT", "PROGRAMMING"], tuitionType: "ONLINE_ONE_TO_ONE", daysPerWeek: 2, budgetMax: 5000 });
  await createTuitionPost(g2, { ...base, title: "Class 7 all subjects — English Version, Dhanmondi", grade: "CLASS_6_8", curriculum: "ENGLISH_VERSION", subjects: ["ALL"], tuitionType: "HOME", daysPerWeek: 5, budgetMin: 7000, budgetMax: 9000, city: "DHAKA", area: "DHANMONDI" });
  const hired = await createTuitionPost(g, { ...base, title: "A Level Accounting — weekend classes", grade: "A_LEVEL", curriculum: "ENGLISH_MEDIUM_EDEXCEL", subjects: ["ACCOUNTING"], tuitionType: "HOME", daysPerWeek: 2, budgetMax: 10000, city: "DHAKA", area: "GULSHAN" });

  const pitch = (n: string) => `Assalamu alaikum. I'm ${n}. I have taught SSC Physics and Higher Math for several years; my students improved from B to A+ by focusing on numericals, past board questions and weekly tests. I can start this week and share a progress note every Friday.`;
  for (const t of tutors.slice(0, 5)) await applyToTuition(t, { postId: main.id, coverNote: pitch(t.fullName), proposedSalary: 7000 + Math.round(Math.random() * 1000), availability: "Sat–Tue after 5pm" });
  const apps = await db.tuitionApplication.findMany({ where: { postId: main.id }, orderBy: { createdAt: "asc" } });
  await shortlistApplicant(g, apps[0].id); await shortlistApplicant(g, apps[2].id);
  await scheduleTrial(g, { applicationId: apps[0].id, scheduledAt: new Date(Date.now() + 2 * 86_400_000), durationMinutes: 45, mode: "ONLINE_LMS", isPaid: false });

  // Completed hire with running engagement
  const acc = tutors[5];
  await applyToTuition(acc, { postId: hired.id, coverNote: pitch(acc.fullName) });
  const ha = await db.tuitionApplication.findFirstOrThrow({ where: { postId: hired.id } });
  await shortlistApplicant(g, ha.id);
  const ag = await hireAndGenerateAgreement(g, { applicationId: ha.id, monthlySalary: 9000, startDate: new Date(Date.now() - 10 * 86_400_000), daysPerWeek: 2, sessionMinutes: 90, signature: g.fullName, consent: true }, "103.10.10.10");
  await signAgreementAsTutor(acc, ag.id, acc.fullName, "103.20.20.20");
  for (const d of [8, 5, 1]) await logSession(acc, { agreementId: ag.id, date: new Date(Date.now() - d * 86_400_000), durationMinutes: 90, status: "COMPLETED", topicsCovered: ["Final accounts", "Partnership", "Cash flow statement"][d % 3] });
  await shareLmsResource(acc, { agreementId: ag.id, type: "COURSE", title: "Edexcel A Level Accounting — Unit 2 video course", url: "https://assunnahskill.edu.bd/courses" });
  await db.tuitionAgreement.update({ where: { id: ag.id }, data: { lmsStudentId: "stu_1024" } });
  await db.lmsProgressSnapshot.createMany({ data: [{ agreementId: ag.id, lmsStudentId: "stu_1024", courseTitle: "A Level Accounting U2", metric: "completion_pct", value: 42 }, { agreementId: ag.id, lmsStudentId: "stu_1024", courseTitle: "A Level Accounting U2", metric: "quiz_avg", value: 78.5 }] });

  console.log(JSON.stringify({ admin: admin.id, guardian: g.id, tutor: tutors[0].id, hiredTutor: acc.id, mainPost: main.id, agreement: ag.id }));
}
main().finally(() => db.$disconnect());
