# Morning Brew — café website with online reservations and a staff dashboard

[![CI](https://github.com/powudev/morning-brew/actions/workflows/ci.yml/badge.svg)](https://github.com/powudev/morning-brew/actions/workflows/ci.yml)
[![Semgrep](https://github.com/powudev/morning-brew/actions/workflows/semgrep.yml/badge.svg)](https://github.com/powudev/morning-brew/actions/workflows/semgrep.yml)

> **Demo project / fictional business.** Morning Brew is not a real café. The address, phone number,
> reviews and reservations are all made up. Please don't enter real personal information on the demo site.

A bilingual (English / Traditional Chinese) small-business website where guests can book a table
online and staff manage reservations from a private dashboard. It is built to show how a small site
can be **fast, accessible, and secure by design**, with every change tested and deployed
automatically.

- **Live demo:** _coming soon_
- **Video walkthrough (Loom):** _coming soon_

| Home (desktop) | Reservation form (mobile) | Staff dashboard |
|---|---|---|
| ![Home page](docs/screenshots/desktop-home.png) | ![Reservation form on mobile](docs/screenshots/mobile-reserve.png) | ![Staff dashboard](docs/screenshots/desktop-admin-dashboard.png) |

More screenshots are in [`docs/screenshots/`](docs/screenshots/).

## Features

**For guests**
- Home, menu, about, privacy and reservation pages, in English (default) and Traditional Chinese (`/zh-tw/`)
- Online booking: pick a date, see the remaining seats for each time slot, and book
- Bot protection with Cloudflare Turnstile (no puzzles for real people)
- Works well on phones; keyboard and screen-reader friendly (WCAG 2.1 AA checked on every page)
- SEO: per-page metadata, `hreflang` for both languages, sitemap, robots.txt, and structured data (JSON-LD)

**For staff**
- Private sign-in (staff accounts only, public sign-up is disabled)
- Reservation list by date, with status filters and a daily summary
- Confirm, cancel, or reset a reservation to pending

## Tech stack

| Area | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Cloudflare Pages Functions (reservation API), Supabase (Postgres, Auth, Row Level Security) |
| Validation | zod (shared by the form and the API) |
| Testing | Vitest + Testing Library, pgTAP, Playwright + axe-core |
| CI/CD | GitHub Actions → Cloudflare Pages; Dependabot; Semgrep |
| Tooling | pnpm, ESLint, Supabase CLI, Wrangler |

## Architecture

```mermaid
flowchart LR
  guest([Guest browser]) -->|static pages| pages[Cloudflare Pages<br/>static HTML/CSS/JS]
  guest -->|POST /api/reserve<br/>GET /api/slots| fn[Pages Function]
  fn -->|verify token| ts[Cloudflare Turnstile]
  fn -->|service key, server only| rpc[(Supabase Postgres<br/>create_reservation)]
  staff([Staff browser]) -->|sign in, own session| auth[Supabase Auth]
  staff -->|read / update, checked by RLS| db[(Supabase Postgres<br/>reservations)]
```

- Public pages are plain static files served by Cloudflare's CDN, so they are fast and cheap to host.
- Guests never talk to the database directly. A booking goes through a small server function that
  checks the bot-protection token, validates the input, and then calls one database function.
- Staff use their own login. The database decides what each person may see or change.

### Booking flow

```mermaid
sequenceDiagram
  participant G as Guest
  participant F as Pages Function
  participant T as Turnstile
  participant D as Postgres
  G->>F: POST /api/reserve (form + Turnstile token)
  F->>F: size / content-type / zod validation
  F->>T: verify token (server side)
  T-->>F: human?
  F->>D: create_reservation(...)
  D->>D: lock the time slot row, count seats, insert
  D-->>F: ok / full / invalid slot
  F-->>G: 201, or a clear error code
```

## Security design

This section is written for business owners, not just engineers. In short: **the website assumes
that anyone on the internet can try to misuse it, and every layer says "no" by default.**

**1. Visitors can't read or change data directly.**
The public site has no permission to read any database table, not even its own reservations list.
Page content (menu, hours, reviews) comes from files built into the site, not from the database.
So even if someone copies the site's public key, there is nothing they can read with it.

**2. Bookings go through one controlled door.**
Every booking is sent to a small server function that:
- checks the request is a reasonable size and format,
- confirms the visitor passed Cloudflare Turnstile (blocks bots and spam),
- validates every field (name, email, party size, date, time slot),
- then calls a single database function that does the booking.

If an outside service is down, the function **fails closed**: it refuses the booking instead of
letting unchecked requests through. Error messages never reveal internal details.

**3. No double-booking, even under heavy traffic.**
When a slot is nearly full and many people book at once, the database locks that time slot while it
counts seats. A test fires 10 bookings at the same time at a slot with 4 seats: exactly 4 succeed.
When the lock is removed on purpose, the same test catches the overbooking every time. That shows
the test really protects against this problem.

**4. Staff see only what staff should see.**
Staff sign in with their own accounts, and public sign-up is turned off. Access is enforced by the
database itself (Row Level Security): only accounts listed as staff can view or update
reservations, and they can only change the *status* field. Someone who signs in without staff access
is signed out immediately and sees nothing. This is tested against a real local database with three
kinds of users: anonymous, signed-in non-staff, and staff.

**5. The powerful key stays on the server.**
The database "master" key exists only in Cloudflare's encrypted environment settings. It is never in
the browser, the code repository, or the build output. The repository only contains
[`.env.example`](.env.example) with variable *names*.

**6. The browser is told what is allowed.**
Every page is served with security headers:
- a strict **Content Security Policy**: pages may only run this site's own scripts (each inline
  script is allowed by its exact fingerprint) plus Cloudflare Turnstile. Injected scripts are blocked.
- the site can't be embedded in other sites (protects against clickjacking),
- HTTPS is enforced (HSTS), and camera, microphone, location and payment features are switched off,
- the staff area is never cached and never indexed by search engines.

The automated browser tests fail if any page triggers a security-policy violation, so a future
change can't quietly weaken it.

**7. Continuous checks.**
Every push runs Semgrep (static security scan) and the full test suite. Dependabot proposes
dependency updates weekly, and only for versions that have been public for at least 7 days. All
GitHub Actions are pinned to exact commit hashes.

**Privacy.** The site collects only what a booking needs (name, email, optional phone and note).
The map is loaded from OpenStreetMap only after the visitor clicks, so no third party sees the visit
before that. There are no analytics or tracking scripts.

## Testing

Development is test-first (TDD): each feature starts with a failing test. Security rules always have
"must be refused" tests, not just happy paths.

| Layer | Tool | What it covers | Count |
|---|---|---|---|
| Unit / component | Vitest, Testing Library | validation rules, i18n, SEO, CSP builder, API handlers (external services mocked), form and dashboard behaviour | 172 |
| Database | pgTAP (`supabase test db`) | schema, table privileges, RLS policies, booking and availability functions | 49 |
| Integration | Vitest + local Supabase | real Auth + REST API + RLS as anonymous / non-staff / staff | 10 |
| End-to-end | Playwright + axe-core | both languages, desktop and mobile: pages, booking success and failures (field errors, full slot, Turnstile rejection), staff sign-in and status changes, accessibility, security headers and CSP | 268 |

Some real problems the tests caught during development:
- a database function let a weekly time slot be booked on the wrong weekday (a `NULL` comparison bug), caught by pgTAP;
- English pages lost their fonts because a Chinese-font CSS variable didn't exist there, caught by a screenshot review and fixed after writing a failing E2E test;
- the validation library probed `eval` on every page load, which the CSP reports as a violation, so it was switched to its no-eval mode.

### Lighthouse

Measured locally on the production build (`wrangler pages dev`, not the live CDN), 5 pages on mobile and desktop:

| Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|
| 100 | 100 | 100 | 100 |

(The staff sign-in page scores lower on SEO on purpose: it is marked `noindex`.)

## CI/CD

```mermaid
flowchart LR
  push[push / PR] --> lint[Lint] --> tsc[Typecheck] --> unit[Unit tests]
  unit --> sb[Start local Supabase] --> pgtap[DB tests] --> int[Integration tests]
  int --> build[Build] --> e2e[E2E tests]
  e2e -->|main only| deploy[Deploy to Cloudflare Pages]
```

If any step fails, nothing is deployed. Semgrep runs as a separate workflow on every push and weekly.

## Local development

Requirements: Node 24, pnpm, Docker, [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
pnpm install
supabase start                      # local Postgres + Auth, applies migrations and seed data
scripts/create-staff.sh you@example.com   # create a local staff account (asks for a password)
pnpm dev                            # http://localhost:3000 (pages only; the booking API needs wrangler)
```

Run the same checks as CI:

```bash
pnpm lint && pnpm typecheck
pnpm test                 # unit / component
supabase test db          # database (pgTAP)
pnpm test:integration     # real local Supabase
pnpm test:e2e             # builds, then runs Playwright against wrangler pages dev
pnpm screenshots          # regenerates docs/screenshots/
```

## Environment variables

See [`.env.example`](.env.example). Never commit real values.

| Name | Where | Public? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build + Pages Function | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build (staff dashboard) | yes, safe because of RLS |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | build | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Pages env only | **no** |
| `TURNSTILE_SECRET_KEY` | Cloudflare Pages env only | **no** |

## Deployment

- Database: `supabase db push` applies the migrations in `supabase/migrations/`.
- Site: the CI `deploy` job builds the static site and runs `wrangler pages deploy` (static files plus `functions/`).
  It runs only on `main`, after all tests pass, and only once the repository variable `DEPLOY_ENABLED` is `true`.

## Project structure

```
app/            routes: (en) English, (zh)/zh-tw Chinese, (admin) staff area
components/     page content, form, dashboard
content/        site, menu and review data + UI strings for both languages
functions/api/  Cloudflare Pages Functions (thin entry points)
server/         API logic (testable, fetch injected)
lib/            shared logic: validation, i18n, SEO, CSP
supabase/       migrations, seed data, pgTAP tests
tests/          integration and Playwright E2E tests
public/_headers security headers
```

## Credits

Illustrations are original SVGs made for this project. Fonts are self-hosted (SIL Open Font License).
Map © OpenStreetMap contributors. Details in [`docs/credits.md`](docs/credits.md).
