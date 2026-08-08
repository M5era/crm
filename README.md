# Interlinked CRM

An internal CRM running two separate businesses side by side: contacts, company
profiles, a lead pipeline and an analytics tab — one independent set per
business.

Built with Next.js (App Router) and Supabase Postgres, deployed on Vercel.

## Workspaces

A **workspace** is a business. Today there are two:

| Workspace | URL | What it is |
|---|---|---|
| Inflate AI | `/inflate-ai` | AI automation agency |
| Photography | `/photography` | Photography business |

They share exactly one thing: the login. Contacts, companies, deals, stages,
activities and every analytics number belong to one workspace and are invisible
from the other — there is deliberately no combined view. Switching is a
dropdown at the top of the sidebar, not a sign-out.

Every URL carries its workspace (`/photography/pipeline`), so links are
shareable and unambiguous, and every query in `lib/queries.ts` takes a
`workspaceId` as its first required argument — a query that forgets to filter
would leak one business into the other, so the parameter is not optional.

Adding a third business is one row in `workspaces` plus its stages; no code
changes.

## What is in it

All five tabs below exist independently inside each workspace.

| Tab | What it does |
|---|---|
| **Dashboard** | Open pipeline value, closed revenue, 30-day lead flow, win rate, deals closing soon, recent activity |
| **Pipeline** | Kanban board across the five stages. Drag cards between columns, or use the ⋯ menu on touch |
| **Contacts** | Searchable list of people, each with a profile: details, their deals, and an activity timeline |
| **Companies** | Company cards and full profiles: people at the company, deals, totals, activity |
| **Analytics** | Funnel conversion, time in stage, monthly lead flow, closed revenue, source performance, top accounts, per-owner leaderboard |

Every lead, contact and company page can log activity (note, call, email,
meeting, task), and it all rolls up into the analytics.

## The pipelines

Each workspace has its own stages, because shoot work and agency work do not
move through the same steps. Seeded by migration — no sample data.

**Inflate AI**

1. **New Lead** — captured but not yet worked
2. **Contacted** — outreach sent, conversation opened
3. **Qualified** — need, budget and timing confirmed
4. **Proposal Sent** — scope and pricing delivered
5. **Closed Won** — signed client, counts toward booked revenue

**Photography**

1. **Enquiry** — new request in, not yet replied to
2. **Quote Sent** — packages and pricing shared
3. **Date Held** — date pencilled in, awaiting deposit
4. **Booked** — deposit paid, date confirmed
5. **Delivered** — gallery delivered and balance paid

The last stage of each is the winning one, so photography revenue counts when
the balance is settled rather than when a date is pencilled in.

Losing a deal is a separate decision from its stage: **Mark lost** on a lead
settles it without moving the card, so a deal that died at Proposal still
reports as having reached Proposal. Lost leads drop off the board and stay on
the record. Moving a lost lead back to a stage reopens it.

Two database triggers keep this honest:

- `sync_lead_status` — landing in the won stage sets `status = 'won'` and stamps
  `closed_at`; moving back out reopens it.
- `log_stage_event` — every transition is appended to `stage_events`, which is
  what makes funnel conversion and time-in-stage real rather than inferred from
  where leads happen to sit today.

## Architecture

```
app/
  (app)/            authentication gate
    [workspace]/    the workspace shell and every scoped page —
                    dashboard, pipeline, leads, contacts, companies, analytics
  login/            sign in / sign up
  actions.ts        all writes (server actions)
lib/
  supabase/         browser, server and middleware clients
  workspace.ts      resolves the workspace in the URL
  queries.ts        server-side reads, all workspace-scoped
  analytics.ts      every metric on the analytics tab
  viz.ts            validated chart palette
  format.ts         money, dates, relative time
components/         UI, dialogs, charts, pipeline board
supabase/migrations/ database schema, in order
```

Reads happen in Server Components; writes go through Server Actions in
`app/actions.ts`. There is no API layer to keep in sync.

Analytics aggregates in TypeScript over four table reads rather than in SQL. At
agency scale (thousands of leads, not millions) one round trip per table beats
six RPCs, and it keeps the funnel maths in one readable place. If the lead table
ever reaches six figures, move `lib/analytics.ts` to a Postgres view.

## Access control

The CRM is private in two layers:

1. **Supabase Auth** — every route except `/login` redirects signed-out
   visitors. Enforced in `middleware.ts` and re-checked in the app layout.
2. **An allowlist** — row level security requires the signed-in account's email
   to be in `public.crm_members`. A stranger who somehow registers sees an
   "account has no CRM access" screen, not your leads.

**To add a teammate**, insert their email and invite them:

```sql
insert into public.crm_members (email, note)
values ('teammate@example.com', 'Sales');
```

Then create the account from **Supabase → Authentication → Users → "Add user" →
"Create new user"**, with **Auto Confirm User** enabled. That confirms the
address directly and avoids the rate-limited confirmation email entirely.

**Recommended**: turn off public signup in
**Supabase → Authentication → Sign In / Providers → Email → "Allow new users to
sign up"**, so accounts can only be created by invitation.

## Charts

The chart palette in `lib/viz.ts` is validated, not hand-picked — lightness
band, chroma floor, colour-vision-deficiency separation, normal-vision floor and
contrast against the app's dark surface. Stage colours are an ordinal ramp (one
hue, monotone lightness) because pipeline stages are ordered; multi-series
charts use categorical slots that pass all-pairs CVD separation. Counts and
revenue never share an axis — they are separate charts.

If you change a chart colour, re-run the validator rather than eyeballing it.

## Local development

```bash
npm install
npm run dev
```

`.env` holds the Supabase project URL and publishable key. Both are public by
design: the key grants only what row level security allows, and every table
requires an allowlisted session. **Never put the `service_role` key in this
repo** — it bypasses RLS entirely.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Database migrations

`supabase/migrations/` is the source of truth, applied in filename order. Paste
a migration into the Supabase SQL editor to apply it, or run them all in order
when setting up a new project.

The workspaces migration (`20260807000001_workspaces.sql`) adds the
`workspaces` table and a `workspace_id` to every other table, backfills existing
rows to Inflate AI, and seeds the photography stages. **It must be applied
before this version of the app is deployed** — until then the app cannot read
`workspaces` and shows the no-access screen.
