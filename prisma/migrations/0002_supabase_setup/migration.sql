-- ShikkhokSetu v2 — Supabase-specific setup. Run AFTER 0001_marketplace_init. Safe to re-run.
--  1. Row Level Security ON for every marketplace table with NO policies → the public anon key can't read them.
--     The app reads/writes only from the server through Prisma (table owner, bypasses RLS).
--  2. Sign-up trigger: auth.users → public.users (role from metadata, never ADMIN).
--  3. Private Storage bucket `kyc` + policies (upload only into your own folder; admins can read).
--  4. One-time import of v1 data (profiles/tutors/tuitions/applications) if those tables exist.

-- ───── 1. RLS ─────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','tutor_profiles','kyc_documents','tuition_posts','tuition_applications','trial_sessions','tuition_agreements',
    'invoices','payment_transactions','credit_ledger','tutoring_sessions','salary_payments','reviews','lms_resource_shares','lms_progress_snapshots',
    'notifications','platform_settings','audit_logs']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ───── 2. Sign-up trigger ─────
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users ("id", "email", "fullName", "role")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'tutor' THEN 'TUTOR'::"UserRole" ELSE 'STUDENT_GUARDIAN'::"UserRole" END
  )
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep email in sync if a user changes it in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_user_email_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN UPDATE public.users SET "email" = NEW.email WHERE "id" = NEW.id; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_change();

-- ───── 3. Private KYC bucket ─────
INSERT INTO storage.buckets ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('kyc', 'kyc', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT ("id") DO UPDATE SET "public" = false, "file_size_limit" = 5242880;

DROP POLICY IF EXISTS "kyc upload own folder" ON storage.objects;
CREATE POLICY "kyc upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "kyc read own or admin" ON storage.objects;
CREATE POLICY "kyc read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.users u WHERE u."id" = auth.uid() AND u."role" = 'ADMIN' AND NOT u."isBlocked")
  ));

-- ───── 4. Import v1 data (only if the v1 tables exist; idempotent) ─────
DO $$
DECLARE
  subj text[] := ARRAY['ALL','MATH','ENGLISH','BANGLA','PHYSICS','CHEMISTRY','BIOLOGY','ICT','ACCOUNTING','QURAN','ARABIC'];
  grd  text[] := ARRAY['PRE_SCHOOL','CLASS_1_5','CLASS_6_8','SSC','HSC','ADMISSION','QURAN_ARABIC'];
  area_code text[] := ARRAY['MIRPUR','UTTARA','DHANMONDI','MOHAMMADPUR','BADDA','KHILKHET','BASHUNDHARA','JATRABARI', NULL, NULL];
  area_city text[] := ARRAY['DHAKA','DHAKA','DHAKA','DHAKA','DHAKA','DHAKA','DHAKA','DHAKA','GAZIPUR','CHATTOGRAM'];
  cur  text[] := ARRAY['BANGLA_MEDIUM','ENGLISH_MEDIUM_CAMBRIDGE','ENGLISH_VERSION','MADRASAH_ALIA'];
  gpref text[] := ARRAY['ANY','MALE','FEMALE'];
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN RETURN; END IF;

  -- users
  INSERT INTO public.users ("id","email","fullName","role","isSuperAdmin","isBlocked","createdAt","updatedAt")
  SELECT p.id, u.email, COALESCE(NULLIF(p.full_name,''), split_part(u.email,'@',1)),
         CASE p.role WHEN 'tutor' THEN 'TUTOR' WHEN 'admin' THEN 'ADMIN' ELSE 'STUDENT_GUARDIAN' END::"UserRole",
         COALESCE(p.is_super,false), COALESCE(p.blocked,false), p.created_at, now()
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  ON CONFLICT ("id") DO NOTHING;

  -- tutor profiles (+ phone)
  INSERT INTO public.tutor_profiles ("id","userId","gender","bio","university","degree","experienceYears","monthlyRate","subjects","grades",
      "curricula","tuitionTypes","preferredCities","preferredAreas","verificationStatus","verifiedAt","currentlyStudying","createdAt","updatedAt")
  SELECT 'v1_' || t.id::text, t.id, CASE WHEN t.gender = 2 THEN 'FEMALE' ELSE 'MALE' END::"Gender", t.bio, t.institution, t.degree, t.experience, t.salary,
         ARRAY(SELECT subj[s+1] FROM unnest(t.subjects) s WHERE s BETWEEN 1 AND 10),
         ARRAY(SELECT grd[c+1] FROM unnest(t.classes) c WHERE c BETWEEN 0 AND 6),
         ARRAY['BANGLA_MEDIUM']::"Curriculum"[], ARRAY['HOME']::"TuitionType"[],
         ARRAY(SELECT DISTINCT area_city[a+1] FROM unnest(t.areas) a WHERE a BETWEEN 0 AND 9),
         ARRAY(SELECT area_code[a+1] FROM unnest(t.areas) a WHERE a BETWEEN 0 AND 7),
         CASE WHEN t.verified THEN 'VERIFIED' ELSE 'UNVERIFIED' END::"VerificationStatus",
         CASE WHEN t.verified THEN now() END, false, t.created_at, now()
  FROM public.tutors t WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.id)
  ON CONFLICT ("userId") DO NOTHING;
  UPDATE public.users u SET "phone" = c.phone FROM public.tutor_contacts c WHERE c.tutor_id = u.id AND u."phone" IS NULL;

  -- tuition posts (+ guardian phone)
  INSERT INTO public.tuition_posts ("id","guardianId","title","grade","curriculum","subjects","tuitionType","daysPerWeek","budgetMax","genderPreference",
      "isOnline","city","area","addressLine","requirements","status","createdAt","updatedAt")
  SELECT 'v1_' || x.id::text, x.guardian_id, 'Tuition for ' || COALESCE(grd[x.cls+1],'student') || ' (imported)', COALESCE(grd[x.cls+1],'SSC'),
         COALESCE(cur[x.medium+1],'BANGLA_MEDIUM')::"Curriculum",
         ARRAY(SELECT subj[s+1] FROM unnest(x.subjects) s WHERE s BETWEEN 0 AND 10), 'HOME'::"TuitionType", x.days, x.salary,
         COALESCE(gpref[x.gender+1],'ANY')::"GenderPreference", false, area_city[x.area+1], area_code[x.area+1], x.address, x.note,
         CASE WHEN x.status = 'open' THEN 'OPEN' ELSE 'CANCELLED' END::"TuitionPostStatus", x.created_at, now()
  FROM public.tuitions x WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = x.guardian_id)
  ON CONFLICT ("id") DO NOTHING;
  UPDATE public.users u SET "phone" = c.phone FROM public.tuition_contacts c JOIN public.tuitions x ON x.id = c.tuition_id
   WHERE x.guardian_id = u.id AND u."phone" IS NULL;

  -- applications (accepted in v1 → shortlisted in v2; the guardian then hires with a proper agreement)
  INSERT INTO public.tuition_applications ("id","postId","tutorProfileId","coverNote","status","shortlistedAt","createdAt","updatedAt")
  SELECT 'v1_' || a.id::text, 'v1_' || a.tuition_id::text, 'v1_' || a.tutor_id::text,
         'Imported from the previous version of the platform.',
         CASE a.status WHEN 'accepted' THEN 'SHORTLISTED' WHEN 'rejected' THEN 'REJECTED' ELSE 'PENDING' END::"ApplicationStatus",
         CASE WHEN a.status = 'accepted' THEN now() END, a.created_at, now()
  FROM public.applications a
  WHERE EXISTS (SELECT 1 FROM public.tuition_posts p WHERE p.id = 'v1_' || a.tuition_id::text)
    AND EXISTS (SELECT 1 FROM public.tutor_profiles tp WHERE tp.id = 'v1_' || a.tutor_id::text)
  ON CONFLICT ("postId","tutorProfileId") DO NOTHING;

  UPDATE public.tuition_posts p SET
    "applicationsCount" = (SELECT count(*) FROM public.tuition_applications a WHERE a."postId" = p.id),
    "shortlistedCount"  = LEAST(p."maxShortlist", (SELECT count(*) FROM public.tuition_applications a WHERE a."postId" = p.id AND a.status = 'SHORTLISTED'))
  WHERE p.id LIKE 'v1_%';
  UPDATE public.tuition_posts SET status = 'SHORTLISTED' WHERE id LIKE 'v1_%' AND status = 'OPEN' AND "shortlistedCount" > 0;
END $$;

-- The owner account is always the super admin
UPDATE public.users SET "role" = 'ADMIN', "isSuperAdmin" = true, "isBlocked" = false WHERE "email" = 'mahfuj@assunnahfoundation.org';
