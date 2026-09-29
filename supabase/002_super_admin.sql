-- ShikkhokSetu migration 002 — super admin, user management, blocking.
-- Safe to run more than once.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_super boolean not null default false;
alter table public.profiles add column if not exists blocked boolean not null default false;

-- Backfill emails for existing users
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is distinct from u.email;

-- New sign-ups store their email too
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name, email)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'tutor' then 'tutor' else 'guardian' end,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end $$;

create or replace function public.is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_super);
$$;
create or replace function public.is_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select blocked from profiles where id = auth.uid()), false);
$$;

-- The owner account
update public.profiles set role = 'admin', is_super = true, blocked = false
where email = 'mahfuj@assunnahfoundation.org';

-- Only the super admin changes roles / blocks people; nobody can grant is_super through the API
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if new.is_super is distinct from old.is_super then
    raise exception 'is_super can only be changed in the SQL editor';
  end if;
  if old.is_super and (new.role <> 'admin' or new.blocked) then
    raise exception 'the super admin cannot be demoted or blocked';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

drop policy if exists "profiles super update" on public.profiles;
create policy "profiles super update" on public.profiles for update
  using (public.is_super()) with check (public.is_super());

-- Admins can remove any application; blocked users cannot post or apply
drop policy if exists "applications admin delete" on public.applications;
create policy "applications admin delete" on public.applications for delete using (public.is_admin());

drop policy if exists "tuitions insert" on public.tuitions;
create policy "tuitions insert" on public.tuitions for insert
  with check (guardian_id = auth.uid() and not public.is_blocked());

drop policy if exists "applications insert" on public.applications;
create policy "applications insert" on public.applications for insert
  with check (tutor_id = auth.uid() and not public.is_blocked()
              and exists (select 1 from public.tuitions where id = tuition_id and status = 'open'));

-- Admins may edit tutor contacts (e.g. fix a wrong number)
drop policy if exists "tutor contact update" on public.tutor_contacts;
create policy "tutor contact update" on public.tutor_contacts for update using (tutor_id = auth.uid() or public.is_admin());
