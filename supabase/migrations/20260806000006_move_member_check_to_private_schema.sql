-- The membership check must be SECURITY DEFINER (it reads a table its own
-- policies protect), but it should not be reachable as a REST endpoint. Moving
-- it to a schema PostgREST does not expose keeps policies working while
-- removing /rest/v1/rpc/is_crm_member.
create schema if not exists private;

create or replace function private.is_crm_member()
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

grant usage on schema private to authenticated;
revoke execute on function private.is_crm_member() from public, anon;
grant execute on function private.is_crm_member() to authenticated;

drop policy "members manage members" on public.crm_members;
create policy "members manage members" on public.crm_members
  for all to authenticated
  using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.stages;
create policy "crm members full access" on public.stages
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.companies;
create policy "crm members full access" on public.companies
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.contacts;
create policy "crm members full access" on public.contacts
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.leads;
create policy "crm members full access" on public.leads
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.activities;
create policy "crm members full access" on public.activities
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop policy "crm members full access" on public.stage_events;
create policy "crm members full access" on public.stage_events
  for all to authenticated using (private.is_crm_member()) with check (private.is_crm_member());

drop function if exists public.is_crm_member();
