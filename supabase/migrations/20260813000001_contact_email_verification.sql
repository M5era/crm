-- Email verification lives on the contact, written by an external n8n
-- workflow (syntax/MX checks plus Verifalia), never by this app. The app only
-- reads it: a verdict decides whether an address is worth a send credit
-- before anything has been sent — the bounce columns only exist after.
--
-- Idempotent on purpose: the live database gained these columns ahead of this
-- file, so everything guards against already existing.
alter table public.contacts
  add column if not exists verification      text,
  add column if not exists verification_note text,
  add column if not exists verified_at       timestamptz;

comment on column public.contacts.verification is
  'Verdict from the external verification workflow. NULL or ''unknown'' means unchecked — the workflow re-queues both; every other value is final until re-verified.';
comment on column public.contacts.verification_note is
  'Human-readable reason for the verdict, e.g. which check failed.';
comment on column public.contacts.verified_at is
  'When the verdict was last written.';

-- The verdict vocabulary is closed. A workflow bug that invents a new value
-- should fail loudly at the write, not leak an unrenderable state into the UI.
alter table public.contacts drop constraint if exists contacts_verification_check;
alter table public.contacts add constraint contacts_verification_check
  check (
    verification is null
    or verification in (
      'ok',             -- MX found, mailbox confirmed deliverable
      'role',           -- deliverable, but a shared mailbox (info@, kontakt@)
      'risky',          -- deliverable but dubious (catch-all, full, low quality)
      'unknown',        -- checks ran but could not decide; will be retried
      'no_reply',       -- unmonitored sender address; a reply goes nowhere
      'disposable',     -- throwaway domain
      'no_mx',          -- domain has no mail server or refuses mail
      'invalid_syntax', -- not a parseable address
      'undeliverable'   -- mailbox confirmed dead
    )
  );
