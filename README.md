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

All six tabs below exist independently inside each workspace.

| Tab | What it does |
|---|---|
| **Dashboard** | Open pipeline value, closed revenue, 30-day lead flow, win rate, deals closing soon, recent activity |
| **Pipeline** | Kanban board across the five stages. Drag cards between columns, or use the ⋯ menu on touch |
| **Replies** | Every email received, sorted into replies, auto-replies, bounces and opt-outs, plus the unmatched queue |
| **Contacts** | Searchable list of people, each with a profile: details, their deals, and an activity timeline |
| **Companies** | Company cards and full profiles: people at the company, deals, totals, activity |
| **Analytics** | Funnel conversion, time in stage, monthly lead flow, closed revenue, source performance, top accounts, per-owner leaderboard |

Every lead, contact and company page can log activity (note, call, email,
meeting, task), and it all rolls up into the analytics.

## Cold outreach vs the pipeline

The most important distinction in this CRM, and the one every CRM makes:

- A **contact** is a person. Cheap. Ten thousand is fine.
- A **deal** is a potential piece of revenue, with a stage, a value and a close
  date. The pipeline board shows *deals only*.

So importing 1,000 cold contacts adds 1,000 rows to **Contacts** and **nothing**
to the board. Outreach is tracked on the person, via a **lifecycle**:

`New → Contacted → Replied → Qualified` (or `Unqualified`, or `Customer`)

The Contacts tab filters by lifecycle, which is the outreach funnel. Only when
someone actually replies do you press **New deal** on their profile — Salesforce
calls this "lead conversion" — which creates the deal and marks them qualified.
That is the only route onto the board, which is what keeps 900 silent
prospects off it.

Sending the outreach is not this app's job — that belongs to a sequencer. But
noticing that somebody *answered* is very much this app's job, and it is what
moves a contact from `contacted` to `replied` without anybody watching an inbox.
See **Reply detection** below.

## Reply detection

The mailbox is read by n8n over IMAP. Everything it finds is posted to this app,
which decides what the message means and who it is from. The split is
deliberate: **n8n owns transport, the CRM owns meaning.** Swapping IMAP for a
provider webhook later changes one n8n node and nothing here.

### Matching is a lookup, not a guess

The hard part of reply detection is not reading mail, it is knowing that *this*
message answers *that* outreach to *that* person. So the send path does half the
work: after the sequencer sends, it posts the email's `Message-ID` to
`POST /api/v1/outbound-email`. A reply carries that id back in `In-Reply-To` /
`References`, which makes the match exact.

Incoming mail is matched on a ladder, ordered by how much each rung can be
trusted:

1. **Threading headers** — `In-Reply-To` / `References` against the ids we
   banked. Survives subject edits, forwards and a changed display name.
2. **From address** — matched against contact email inside the workspace.
   Nearly as good, but misses anyone answering from a second address.
3. **Nothing.** There is deliberately no fuzzy third rung. Unmatched mail goes
   to a queue on the **Replies** tab for a human to look at, which is strictly
   better than a confident wrong answer.

### Not every incoming email is a reply

Classified before it is matched, because getting this backwards is what makes a
funnel lie:

| Verdict | Detected by | What it does |
|---|---|---|
| **Bounce** | DSN content-type, null `Return-Path`, `X-Failed-Recipients`, `MAILER-DAEMON`, subject | Stamps `bounced_at`; disqualifies only a contact who never got through |
| **Auto-reply** | `Auto-Submitted`, `Precedence`, `X-Autoreply`, `List-Unsubscribe`, subject | Logged and shown, but **never** moves the lifecycle |
| **Opt-out** | Opt-out phrasing near the start of the body | Stamps `unsubscribed_at`, marks unqualified |
| **Reply** | None of the above | Moves `new`/`contacted` → `replied`, stamps `last_reply_at` |

Subjects are matched in English and German, so `Abwesenheitsnotiz` is recognised
as an out-of-office and `Unzustellbar` as a bounce.

Every rule guards against moving somebody *backwards*. A qualified contact who
replies again stays qualified; a customer whose mailbox bounces stays a
customer. A bounce from a live conversation is usually a full mailbox, not a bad
lead, so it only disqualifies someone still in the cold end of the funnel.

The endpoint is safe to call twice — `message_id` is unique per workspace, and
IMAP will redeliver whenever a poll is interrupted mid-batch. Messages with no
`Message-ID` get a stable synthetic one derived from the envelope, so a real
reply is never dropped on a technicality.

### Setting up the iCloud side

iCloud+ works fine for this. It has no push API, so n8n polls — a few minutes of
latency, invisible for outreach.

1. Turn on two-factor authentication for the Apple ID, then create an
   **app-specific password** at [appleid.apple.com](https://appleid.apple.com) →
   *Sign-In and Security* → *App-Specific Passwords*.
2. Add an IMAP credential in n8n:

   | Setting | Value |
   |---|---|
   | Host | `imap.mail.me.com` |
   | Port | `993`, SSL/TLS |
   | User | your **iCloud Mail** address — `@me.com`, `@icloud.com` or `@mac.com` |
   | Password | the app-specific password |

   Custom-domain mail lands in the same mailbox, so one connection covers every
   domain.

   The username is the usual reason a login fails. It must be the iCloud Mail
   address, which is often **not** the address you sign in to Apple with — an
   Apple ID can itself be a custom domain, and that form will not authenticate
   against IMAP. Apple issued `@mac.com`, `@me.com` and `@icloud.com` in
   different eras and they all reach the same mailbox, so use whichever one the
   account was given.
3. Import [`docs/n8n-inbound-email.json`](docs/n8n-inbound-email.json), then set
   the credential, your CRM URL and an API key on the HTTP node.

### The sending side

[`docs/n8n-outbound-email.json`](docs/n8n-outbound-email.json) is a complete
outreach run: it pulls contacts from the CRM, drops anyone bounced or opted out,
sends over iCloud SMTP, and posts each `Message-ID` back. If you already have a
send flow, copy its last two nodes — **Extract Message-ID** and
**POST /api/v1/outbound-email** — onto the end of yours instead of using it
whole.

The SMTP credential is the same app-specific password as IMAP:

| Setting | Value |
|---|---|
| Host | `smtp.mail.me.com` |
| Port | `587` (STARTTLS — leave SSL/TLS **off**) |
| User | the same iCloud Mail address as the IMAP credential |
| Password | the app-specific password |

Send *from* an address the account actually owns, custom domain included.
iCloud rejects a `From` it does not recognise, and a rejected send is the one
failure this pipeline cannot recover from.

Recording the `Message-ID` is the step worth not skipping. Without it a reply
still matches on the from-address, so most things keep working — which is
exactly why the gap goes unnoticed. What you lose is every reply from a second
address, and any idea of which campaign a reply answers.

`contact_matched: false` in the response means the recipient is not in that
workspace, so replies to that thread will land in the unmatched queue. Worth an
alert in n8n.

Sending through iCloud is capped at 1,000 messages and 1,000 recipients a day.
That is a personal-use mailbox, so it gives you no bounce feedback of its own —
which is exactly why bounces are detected by reading the mail itself.

## The pipelines

Each workspace has its own stages, because shoot work and agency work do not
move through the same steps. Seeded by migration — no sample data — and fully
editable in **Settings**: add, rename, describe, reorder, delete, and choose
which stage wins the deal. Colours are reassigned automatically across the
validated ramp so the board always reads dark to light, whatever the length.

A stage holding deals cannot be deleted; move them first. That is a foreign key
in the database, not just a UI check.

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
    [workspace]/    the workspace shell and every scoped page — dashboard,
                    pipeline, replies, leads, contacts, companies, analytics
  api/v1/           machine access: import, deals, inbound/outbound email
  login/            sign in / sign up
  actions.ts        all writes (server actions)
lib/
  supabase/         browser, server and middleware clients
  workspace.ts      resolves the workspace in the URL
  queries.ts        server-side reads, all workspace-scoped
  analytics.ts      every metric on the analytics tab
  inbound-email.ts  classify a received email, then match it to a contact
  api-auth.ts       bearer-token auth for the API routes
  viz.ts            validated chart palette
  format.ts         money, dates, relative time
components/         UI, dialogs, charts, pipeline board
docs/               importable n8n workflow
supabase/migrations/ database schema, in order
```

Reads happen in Server Components and writes go through Server Actions in
`app/actions.ts`, so the UI has no API layer to keep in sync. `app/api/v1/` is
for machines only — imports and the email workflow — and authenticates itself.

Analytics aggregates in TypeScript over four table reads rather than in SQL. At
agency scale (thousands of leads, not millions) one round trip per table beats
six RPCs, and it keeps the funnel maths in one readable place. If the lead table
ever reaches six figures, move `lib/analytics.ts` to a Postgres view.

## Importing data

**CSV** — Settings → Import, or the Import button on Contacts. Upload a file or
paste rows. Column names are matched loosely, so `First Name`, `first_name` and
`Given Name` all land in the same field and exports from LinkedIn, Apollo or a
spreadsheet import without renaming anything. Unknown columns are ignored and
reported.

Re-importing the same list **updates** rather than duplicates: email is the
identity for people, name for companies. A company named in a contact row is
created if it does not exist.

**API** — for n8n, a sequencer webhook, or any script. Create a key in
Settings; it is shown once and stored only as a hash. Keys are scoped to a
single workspace.

```
POST /api/v1/contacts        { "contacts": [ ... ] }    up to 1000 per call
POST /api/v1/companies       { "companies": [ ... ] }
POST /api/v1/deals           { "title": "...", "contact_email": "..." }
POST /api/v1/outbound-email  { "message_id": "...", "contact_email": "..." }
POST /api/v1/inbound-email   { "message_id": "...", "from_email": "...", ... }
GET  /api/v1/contacts?lifecycle=replied&limit=100
GET  /api/v1/deals?status=open
GET  /api/v1/inbound-email?unmatched=true

Authorization: Bearer crm_live_…
```

The two email endpoints are the reply-detection pair — see **Reply detection**
above. `GET /api/v1/inbound-email?unmatched=true` reads the queue back, which is
worth a nightly "did we miss anyone" check in n8n.

`POST /api/v1/deals` is the interesting one: pass `contact_email` and
`company_name` and it matches or creates both, so a webhook never needs to know
an id. It also moves the contact's lifecycle to `replied`.

Every import is recorded in `import_runs` so a bad file can be understood after
the fact.

### Required for the API

The API has no user session, so it authenticates the bearer token itself and
then talks to Postgres with the service role. Set this in **Vercel → Settings →
Environment Variables** (never in the repo):

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Project Settings → API>
```

Without it the API returns 503 rather than falling back to something weaker.
The rest of the app does not use it.

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

`20260809000001_email_reply_detection.sql` adds the `email_messages` table and
the bounce/opt-out columns on contacts. Apply it before deploying this version,
or the Replies tab and both email endpoints will error.

The workspaces migration (`20260807000001_workspaces.sql`) adds the
`workspaces` table and a `workspace_id` to every other table, backfills existing
rows to Inflate AI, and seeds the photography stages. **It must be applied
before this version of the app is deployed** — until then the app cannot read
`workspaces` and shows the no-access screen.
