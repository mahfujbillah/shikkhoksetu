-- ShikkhokSetu marketplace — initial schema (mirrors prisma/schema.prisma exactly).
-- Idempotent where practical; run in Supabase → SQL Editor (or `prisma migrate deploy`).

-- ───────── Enums ─────────
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('STUDENT_GUARDIAN', 'TUTOR', 'ADMIN');
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
  CREATE TYPE "GenderPreference" AS ENUM ('ANY', 'MALE', 'FEMALE');
  CREATE TYPE "Curriculum" AS ENUM ('BANGLA_MEDIUM', 'ENGLISH_VERSION', 'ENGLISH_MEDIUM_CAMBRIDGE', 'ENGLISH_MEDIUM_EDEXCEL', 'INTERNATIONAL_BACCALAUREATE', 'MADRASAH_ALIA', 'MADRASAH_QAWMI', 'OTHER');
  CREATE TYPE "TuitionType" AS ENUM ('HOME', 'ONLINE_ONE_TO_ONE', 'GROUP_BATCH');
  CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
  CREATE TYPE "KycDocumentType" AS ENUM ('NID', 'PASSPORT', 'STUDENT_ID', 'EDUCATIONAL_CERTIFICATE', 'PHOTO', 'OTHER');
  CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  CREATE TYPE "TuitionPostStatus" AS ENUM ('OPEN', 'SHORTLISTED', 'CONFIRMED', 'CANCELLED');
  CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'REJECTED', 'CONFIRMED', 'WITHDRAWN');
  CREATE TYPE "TrialMode" AS ENUM ('ONLINE_LMS', 'ONLINE_MEET', 'IN_PERSON');
  CREATE TYPE "TrialStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
  CREATE TYPE "AgreementStatus" AS ENUM ('PENDING_SIGNATURES', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');
  CREATE TYPE "CommissionPayer" AS ENUM ('TUTOR', 'GUARDIAN');
  CREATE TYPE "MonetizationMode" AS ENUM ('COMMISSION', 'CREDITS', 'HYBRID');
  CREATE TYPE "AgreementPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED', 'REFUNDED');
  CREATE TYPE "InvoiceType" AS ENUM ('PLATFORM_COMMISSION', 'TRIAL_FEE', 'CREDIT_PACK', 'SUBSCRIPTION');
  CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'OVERDUE', 'VOID');
  CREATE TYPE "PaymentProvider" AS ENUM ('SSLCOMMERZ', 'STRIPE', 'MANUAL');
  CREATE TYPE "TransactionStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');
  CREATE TYPE "SessionStatus" AS ENUM ('COMPLETED', 'MISSED', 'CANCELLED', 'RESCHEDULED');
  CREATE TYPE "SalaryStatus" AS ENUM ('DUE', 'PAID');
  CREATE TYPE "LmsResourceType" AS ENUM ('COURSE', 'VIDEO', 'ASSIGNMENT', 'MATERIAL', 'QUIZ');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Human-friendly invoice numbers (INV-2026-000001) without race conditions
CREATE SEQUENCE IF NOT EXISTS "invoice_number_seq";

-- ───────── Tables ─────────
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'STUDENT_GUARDIAN',
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  "avatarUrl" TEXT,
  "lmsUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_lmsUserId_key" ON "users"("lmsUserId");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

CREATE TABLE IF NOT EXISTS "tutor_profiles" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "gender" "Gender" NOT NULL,
  "headline" TEXT,
  "bio" TEXT,
  "university" TEXT NOT NULL,
  "department" TEXT,
  "degree" TEXT,
  "graduationYear" INTEGER,
  "currentlyStudying" BOOLEAN NOT NULL DEFAULT true,
  "experienceYears" INTEGER NOT NULL DEFAULT 0,
  "monthlyRate" DECIMAL(12,2),
  "hourlyRate" DECIMAL(12,2),
  "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "grades" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "curricula" "Curriculum"[] DEFAULT ARRAY[]::"Curriculum"[],
  "tuitionTypes" "TuitionType"[] DEFAULT ARRAY[]::"TuitionType"[],
  "preferredCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "preferredAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "maxDaysPerWeek" INTEGER,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "verifiedAt" TIMESTAMP(3),
  "verificationNote" TEXT,
  "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "completedTuitions" INTEGER NOT NULL DEFAULT 0,
  "creditBalance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tutor_profiles_credit_nonneg" CHECK ("creditBalance" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "tutor_profiles_userId_key" ON "tutor_profiles"("userId");
CREATE INDEX IF NOT EXISTS "tutor_profiles_verificationStatus_idx" ON "tutor_profiles"("verificationStatus");
CREATE INDEX IF NOT EXISTS "tutor_profiles_subjects_idx" ON "tutor_profiles" USING GIN ("subjects");
CREATE INDEX IF NOT EXISTS "tutor_profiles_preferredCities_idx" ON "tutor_profiles" USING GIN ("preferredCities");

CREATE TABLE IF NOT EXISTS "kyc_documents" (
  "id" TEXT PRIMARY KEY,
  "tutorProfileId" TEXT NOT NULL REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "KycDocumentType" NOT NULL,
  "storagePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "reviewedById" UUID REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "kyc_documents_tutorProfileId_idx" ON "kyc_documents"("tutorProfileId");
CREATE INDEX IF NOT EXISTS "kyc_documents_status_createdAt_idx" ON "kyc_documents"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "tuition_posts" (
  "id" TEXT PRIMARY KEY,
  "number" SERIAL NOT NULL,
  "guardianId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "studentName" TEXT,
  "studentGender" "Gender",
  "studentsCount" INTEGER NOT NULL DEFAULT 1,
  "grade" TEXT NOT NULL,
  "curriculum" "Curriculum" NOT NULL,
  "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tuitionType" "TuitionType" NOT NULL,
  "daysPerWeek" INTEGER NOT NULL,
  "sessionMinutes" INTEGER NOT NULL DEFAULT 60,
  "preferredTime" TEXT,
  "budgetMin" DECIMAL(12,2),
  "budgetMax" DECIMAL(12,2) NOT NULL,
  "salaryNegotiable" BOOLEAN NOT NULL DEFAULT false,
  "genderPreference" "GenderPreference" NOT NULL DEFAULT 'ANY',
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "city" TEXT,
  "area" TEXT,
  "addressLine" TEXT,
  "requirements" TEXT,
  "startDate" TIMESTAMP(3),
  "status" "TuitionPostStatus" NOT NULL DEFAULT 'OPEN',
  "applicationsCount" INTEGER NOT NULL DEFAULT 0,
  "shortlistedCount" INTEGER NOT NULL DEFAULT 0,
  "maxShortlist" INTEGER NOT NULL DEFAULT 5,
  "hiredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Defence in depth for the shortlist cap (the service also enforces it under a row lock)
  CONSTRAINT "tuition_posts_shortlist_cap" CHECK ("shortlistedCount" >= 0 AND "shortlistedCount" <= "maxShortlist"),
  CONSTRAINT "tuition_posts_days" CHECK ("daysPerWeek" BETWEEN 1 AND 7),
  CONSTRAINT "tuition_posts_budget" CHECK ("budgetMax" > 0 AND ("budgetMin" IS NULL OR "budgetMin" <= "budgetMax"))
);
CREATE UNIQUE INDEX IF NOT EXISTS "tuition_posts_number_key" ON "tuition_posts"("number");
CREATE INDEX IF NOT EXISTS "tuition_posts_status_createdAt_idx" ON "tuition_posts"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "tuition_posts_city_area_idx" ON "tuition_posts"("city", "area");
CREATE INDEX IF NOT EXISTS "tuition_posts_curriculum_idx" ON "tuition_posts"("curriculum");
CREATE INDEX IF NOT EXISTS "tuition_posts_tuitionType_idx" ON "tuition_posts"("tuitionType");
CREATE INDEX IF NOT EXISTS "tuition_posts_subjects_idx" ON "tuition_posts" USING GIN ("subjects");
CREATE INDEX IF NOT EXISTS "tuition_posts_guardianId_idx" ON "tuition_posts"("guardianId");

CREATE TABLE IF NOT EXISTS "tuition_applications" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "tuition_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tutorProfileId" TEXT NOT NULL REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "coverNote" TEXT NOT NULL,
  "proposedSalary" DECIMAL(12,2),
  "availability" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "guardianNote" TEXT,
  "shortlistedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "creditsSpent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "tuition_applications_postId_tutorProfileId_key" ON "tuition_applications"("postId", "tutorProfileId");
CREATE INDEX IF NOT EXISTS "tuition_applications_postId_status_idx" ON "tuition_applications"("postId", "status");
CREATE INDEX IF NOT EXISTS "tuition_applications_tutorProfileId_status_idx" ON "tuition_applications"("tutorProfileId", "status");

CREATE TABLE IF NOT EXISTS "trial_sessions" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL REFERENCES "tuition_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdById" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 45,
  "mode" "TrialMode" NOT NULL,
  "meetingLink" TEXT,
  "location" TEXT,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "fee" DECIMAL(12,2),
  "status" "TrialStatus" NOT NULL DEFAULT 'SCHEDULED',
  "guardianFeedback" TEXT,
  "guardianRating" INTEGER,
  "tutorFeedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "trial_sessions_applicationId_idx" ON "trial_sessions"("applicationId");
CREATE INDEX IF NOT EXISTS "trial_sessions_scheduledAt_idx" ON "trial_sessions"("scheduledAt");

CREATE TABLE IF NOT EXISTS "tuition_agreements" (
  "id" TEXT PRIMARY KEY,
  "agreementNumber" SERIAL NOT NULL,
  "applicationId" TEXT NOT NULL REFERENCES "tuition_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "postId" TEXT NOT NULL REFERENCES "tuition_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "guardianId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "tutorProfileId" TEXT NOT NULL REFERENCES "tutor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "monthlySalary" DECIMAL(12,2) NOT NULL,
  "daysPerWeek" INTEGER NOT NULL,
  "sessionMinutes" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "tuitionType" "TuitionType" NOT NULL,
  "grade" TEXT NOT NULL,
  "curriculum" "Curriculum" NOT NULL,
  "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "location" TEXT,
  "specialTerms" TEXT,
  "terms" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL DEFAULT '2026-10',
  "commissionRate" DECIMAL(5,2) NOT NULL,
  "commissionAmount" DECIMAL(12,2) NOT NULL,
  "commissionPayer" "CommissionPayer" NOT NULL,
  "paymentStatus" "AgreementPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "status" "AgreementStatus" NOT NULL DEFAULT 'PENDING_SIGNATURES',
  "guardianSignature" TEXT,
  "guardianSignedAt" TIMESTAMP(3),
  "guardianSignedIp" TEXT,
  "tutorSignature" TEXT,
  "tutorSignedAt" TIMESTAMP(3),
  "tutorSignedIp" TEXT,
  "activatedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "endReason" TEXT,
  "lmsStudentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "tuition_agreements_agreementNumber_key" ON "tuition_agreements"("agreementNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "tuition_agreements_applicationId_key" ON "tuition_agreements"("applicationId");
CREATE INDEX IF NOT EXISTS "tuition_agreements_postId_status_idx" ON "tuition_agreements"("postId", "status");
CREATE INDEX IF NOT EXISTS "tuition_agreements_guardianId_status_idx" ON "tuition_agreements"("guardianId", "status");
CREATE INDEX IF NOT EXISTS "tuition_agreements_tutorProfileId_status_idx" ON "tuition_agreements"("tutorProfileId", "status");
-- Only ONE live (pending or active) agreement per job — hard guarantee against double-hiring.
CREATE UNIQUE INDEX IF NOT EXISTS "tuition_agreements_one_live_per_post"
  ON "tuition_agreements"("postId") WHERE "status" IN ('PENDING_SIGNATURES', 'ACTIVE');

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "invoiceNumber" TEXT NOT NULL,
  "type" "InvoiceType" NOT NULL,
  "billedToId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "agreementId" TEXT REFERENCES "tuition_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "trialSessionId" TEXT REFERENCES "trial_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "lineItems" JSONB NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "creditsGranted" INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_trialSessionId_key" ON "invoices"("trialSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_agreementId_type_key" ON "invoices"("agreementId", "type");
CREATE INDEX IF NOT EXISTS "invoices_billedToId_status_idx" ON "invoices"("billedToId", "status");
CREATE INDEX IF NOT EXISTS "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "provider" "PaymentProvider" NOT NULL,
  "tranId" TEXT NOT NULL,
  "providerRef" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'INITIATED',
  "failureReason" TEXT,
  "rawPayload" JSONB,
  "recordedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_tranId_key" ON "payment_transactions"("tranId");
CREATE INDEX IF NOT EXISTS "payment_transactions_invoiceId_idx" ON "payment_transactions"("invoiceId");

CREATE TABLE IF NOT EXISTS "credit_ledger" (
  "id" TEXT PRIMARY KEY,
  "tutorProfileId" TEXT NOT NULL REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "credit_ledger_tutorProfileId_createdAt_idx" ON "credit_ledger"("tutorProfileId", "createdAt");

CREATE TABLE IF NOT EXISTS "tutoring_sessions" (
  "id" TEXT PRIMARY KEY,
  "agreementId" TEXT NOT NULL REFERENCES "tuition_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "loggedById" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "date" DATE NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'COMPLETED',
  "topicsCovered" TEXT,
  "homework" TEXT,
  "tutorNote" TEXT,
  "guardianConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "guardianConfirmedAt" TIMESTAMP(3),
  "guardianFeedback" TEXT,
  "studentRating" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "tutoring_sessions_agreementId_date_key" ON "tutoring_sessions"("agreementId", "date");
CREATE INDEX IF NOT EXISTS "tutoring_sessions_agreementId_date_idx" ON "tutoring_sessions"("agreementId", "date" DESC);

CREATE TABLE IF NOT EXISTS "salary_payments" (
  "id" TEXT PRIMARY KEY,
  "agreementId" TEXT NOT NULL REFERENCES "tuition_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "periodMonth" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "SalaryStatus" NOT NULL DEFAULT 'DUE',
  "paidAt" TIMESTAMP(3),
  "method" TEXT,
  "note" TEXT,
  "confirmedByTutor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "salary_payments_agreementId_periodMonth_key" ON "salary_payments"("agreementId", "periodMonth");

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT PRIMARY KEY,
  "agreementId" TEXT NOT NULL REFERENCES "tuition_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tutorProfileId" TEXT NOT NULL REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_agreementId_key" ON "reviews"("agreementId");
CREATE INDEX IF NOT EXISTS "reviews_tutorProfileId_createdAt_idx" ON "reviews"("tutorProfileId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "lms_resource_shares" (
  "id" TEXT PRIMARY KEY,
  "agreementId" TEXT NOT NULL REFERENCES "tuition_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sharedById" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "type" "LmsResourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "lmsResourceId" TEXT,
  "note" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "lms_resource_shares_agreementId_createdAt_idx" ON "lms_resource_shares"("agreementId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "lms_progress_snapshots" (
  "id" TEXT PRIMARY KEY,
  "agreementId" TEXT NOT NULL REFERENCES "tuition_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "lmsStudentId" TEXT NOT NULL,
  "courseId" TEXT,
  "courseTitle" TEXT,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "payload" JSONB,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "lms_progress_snapshots_agreementId_recordedAt_idx" ON "lms_progress_snapshots"("agreementId", "recordedAt" DESC);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "monetizationMode" "MonetizationMode" NOT NULL DEFAULT 'COMMISSION',
  "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 50,
  "commissionPayer" "CommissionPayer" NOT NULL DEFAULT 'TUTOR',
  "applyCreditCost" INTEGER NOT NULL DEFAULT 1,
  "maxShortlist" INTEGER NOT NULL DEFAULT 5,
  "invoiceDueDays" INTEGER NOT NULL DEFAULT 7,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "actorId" UUID REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
