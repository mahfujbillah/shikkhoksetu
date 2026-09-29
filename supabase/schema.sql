-- ShikkhokSetu database schema — run once in Supabase → SQL Editor.
-- Numbers in cls/subjects/area/medium/gender are indexes into the option lists in src/lib/i18n.ts.

-- ───────────── Profiles (one per login) ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'guardian' check (role in ('guardian', 'tutor', 'admin')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically when someone signs up (role can only be guardian or tutor).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'tutor' then 'tutor' else 'guardian' end,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Tutors (public profile, no phone) ─────────────
create table if not exists public.tutors (
  id uuid primary key references public.profiles on delete cascade,
  full_name text not null,
  gender smallint not null check (gender in (1, 2)),
  institution text not null,
  degree text,
  subjects int[] not null default '{}',
  classes int[] not null default '{}',
  areas int[] not null default '{}',
  experience int not null default 0,
  salary int,
  bio text,
  verified boolean not null default false,
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Tutors may not verify themselves or edit their own rating.
create or replace function public.protect_tutor_fields() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified := false; new.rating := 0; new.reviews_count := 0;
    else
      new.verified := old.verified; new.rating := old.rating; new.reviews_count := old.reviews_count;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tutors_protect on public.tutors;
create trigger tutors_protect before insert or update on public.tutors
  for each row execute function public.protect_tutor_fields();

-- Tutor phone — private
create table if not exists public.tutor_contacts (
  tutor_id uuid primary key references public.tutors on delete cascade,
  phone text not null,
  email text
);

-- ───────────── Tuitions ─────────────
create table if not exists public.tuitions (
  id bigint generated always as identity primary key,
  guardian_id uuid not null references public.profiles on delete cascade,
  cls int not null,
  subjects int[] not null default '{}',
  medium int not null default 0,
  area int not null,
  address text,
  days int not null default 3 check (days between 1 and 7),
  salary int not null check (salary > 0),
  gender int not null default 0,
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  applicants_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Guardian contact — private
create table if not exists public.tuition_contacts (
  tuition_id bigint primary key references public.tuitions on delete cascade,
  name text not null,
  phone text not null
);

-- ───────────── Applications ─────────────
create table if not exists public.applications (
  id bigint generated always as identity primary key,
  tuition_id bigint not null references public.tuitions on delete cascade,
  tutor_id uuid not null references public.tutors on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (tuition_id, tutor_id)
);

create or replace function public.bump_applicants() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update tuitions set applicants_count = applicants_count + 1 where id = new.tuition_id;
  elsif tg_op = 'DELETE' then
    update tuitions set applicants_count = greatest(applicants_count - 1, 0) where id = old.tuition_id;
  end if;
  return null;
end $$;
drop trigger if exists applications_count on public.applications;
create trigger applications_count after insert or delete on public.applications
  for each row execute function public.bump_applicants();

-- Helpers used by the privacy rules
create or replace function public.owns_tuition(t bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tuitions where id = t and guardian_id = auth.uid());
$$;
create or replace function public.accepted_for_tuition(t bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from applications where tuition_id = t and tutor_id = auth.uid() and status = 'accepted');
$$;
create or replace function public.guardian_accepted_tutor(tu uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from applications a join tuitions t on t.id = a.tuition_id
    where a.tutor_id = tu and a.status = 'accepted' and t.guardian_id = auth.uid()
  );
$$;

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.tutor_contacts enable row level security;
alter table public.tuitions enable row level security;
alter table public.tuition_contacts enable row level security;
alter table public.applications enable row level security;

-- profiles
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- tutors: everyone can browse; only the tutor edits their own
drop policy if exists "tutors public read" on public.tutors;
create policy "tutors public read" on public.tutors for select using (true);
drop policy if exists "tutors write own" on public.tutors;
create policy "tutors write own" on public.tutors for insert with check (id = auth.uid());
drop policy if exists "tutors update own" on public.tutors;
create policy "tutors update own" on public.tutors for update using (id = auth.uid() or public.is_admin());
drop policy if exists "tutors admin delete" on public.tutors;
create policy "tutors admin delete" on public.tutors for delete using (public.is_admin());

-- tutor_contacts: the tutor, admin, and guardians who accepted this tutor
drop policy if exists "tutor contact read" on public.tutor_contacts;
create policy "tutor contact read" on public.tutor_contacts for select
  using (tutor_id = auth.uid() or public.is_admin() or public.guardian_accepted_tutor(tutor_id));
drop policy if exists "tutor contact write" on public.tutor_contacts;
create policy "tutor contact write" on public.tutor_contacts for insert with check (tutor_id = auth.uid());
drop policy if exists "tutor contact update" on public.tutor_contacts;
create policy "tutor contact update" on public.tutor_contacts for update using (tutor_id = auth.uid());

-- tuitions: open ones are public
drop policy if exists "tuitions read" on public.tuitions;
create policy "tuitions read" on public.tuitions for select
  using (status = 'open' or guardian_id = auth.uid() or public.is_admin() or public.accepted_for_tuition(id));
drop policy if exists "tuitions insert" on public.tuitions;
create policy "tuitions insert" on public.tuitions for insert with check (guardian_id = auth.uid());
drop policy if exists "tuitions update" on public.tuitions;
create policy "tuitions update" on public.tuitions for update using (guardian_id = auth.uid() or public.is_admin());
drop policy if exists "tuitions delete" on public.tuitions;
create policy "tuitions delete" on public.tuitions for delete using (guardian_id = auth.uid() or public.is_admin());

-- tuition_contacts: owner, admin, and the accepted tutor
drop policy if exists "tuition contact read" on public.tuition_contacts;
create policy "tuition contact read" on public.tuition_contacts for select
  using (public.owns_tuition(tuition_id) or public.is_admin() or public.accepted_for_tuition(tuition_id));
drop policy if exists "tuition contact write" on public.tuition_contacts;
create policy "tuition contact write" on public.tuition_contacts for insert with check (public.owns_tuition(tuition_id));

-- applications
drop policy if exists "applications read" on public.applications;
create policy "applications read" on public.applications for select
  using (tutor_id = auth.uid() or public.owns_tuition(tuition_id) or public.is_admin());
drop policy if exists "applications insert" on public.applications;
create policy "applications insert" on public.applications for insert
  with check (tutor_id = auth.uid() and exists (select 1 from public.tuitions where id = tuition_id and status = 'open'));
drop policy if exists "applications decide" on public.applications;
create policy "applications decide" on public.applications for update
  using (public.owns_tuition(tuition_id) or public.is_admin());
drop policy if exists "applications withdraw" on public.applications;
create policy "applications withdraw" on public.applications for delete using (tutor_id = auth.uid());

-- After signing up yourself, make your own account admin (replace the email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
