-- Defence in depth: being signed in is not enough to read the CRM — the
-- account's email must be on the allowlist. This holds even if public signup
-- is ever left enabled by accident.
create table public.crm_members (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.crm_members is
  'Emails allowed to use the CRM. Add a row to grant a teammate access.';

alter table public.crm_members enable row level security;

create or replace function public.is_crm_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.crm_members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke execute on function public.is_crm_member() from public, anon;
grant execute on function public.is_crm_member() to authenticated;

-- Seed the first member. Without this nobody can get in, and nobody could add
-- themselves either.
insert into public.crm_members (email, note)
values
  ('marc@marcserafin.com',               'Owner'),
  ('marc@interlinked.dev',               'Owner'),
  ('marc.serafin.photography@gmail.com', 'Owner'),
  ('marcserafin.info@gmail.com',         'Owner')
on conflict (email) do nothing;

create policy "members manage members" on public.crm_members
  for all to authenticated
  using (public.is_crm_member()) with check (public.is_crm_member());

drop policy "authenticated full access" on public.stages;
drop policy "authenticated full access" on public.companies;
drop policy "authenticated full access" on public.contacts;
drop policy "authenticated full access" on public.leads;
drop policy "authenticated full access" on public.activities;
drop policy "authenticated full access" on public.stage_events;

create policy "crm members full access" on public.stages
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());

create policy "crm members full access" on public.companies
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());

create policy "crm members full access" on public.contacts
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());

create policy "crm members full access" on public.leads
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());

create policy "crm members full access" on public.activities
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());

create policy "crm members full access" on public.stage_events
  for all to authenticated using (public.is_crm_member()) with check (public.is_crm_member());
