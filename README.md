# Accentra

Accounting for growing businesses — invoicing, expenses, transactions, reports
and payroll in one ledger. Built with Vue 3, Vite and Tailwind CSS v4, backed by
Supabase for auth, data and storage. Amounts are in Ghana Cedi (₵).

The app is two surfaces:

- **Marketing site** at `/` — hero, features, and the sign-up funnel.
- **Portal** at `/portal/*` — the signed-in product, behind an auth guard.

---

## Contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [Database setup](#database-setup)
4. [Project structure](#project-structure)
5. [Architecture](#architecture)
6. [Routing and auth](#routing-and-auth)
7. [Design system](#design-system)
8. [Adding a new portal page](#adding-a-new-portal-page)
9. [Conventions](#conventions)
10. [Troubleshooting](#troubleshooting)

---

## Quick start

Requires **Node 20.19+ or 22.12+** (built on Node 24) and a Supabase project.

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev                    # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot module replacement |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

The marketing site renders without any backend. The portal needs both the
environment variables **and** the database schema applied — see the next two
sections.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in both values from your Supabase
dashboard (**Connect** in the top bar, or **Settings → API Keys**):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Only `VITE_`-prefixed variables reach the browser bundle — which means
**anything you prefix with `VITE_` ships to every visitor**. Never put a secret
key (`sb_secret_…`) or the `service_role` key in this file.

`src/lib/supabaseClient.js` throws at startup if either value is missing or
still holds a placeholder. That is deliberate: a loud failure on boot beats an
opaque "Invalid API key" on the first query. Restart the dev server after
editing `.env.local` — Vite reads it once.

---

## Database setup

The complete schema lives in [`supabase_schema.md`](./supabase_schema.md):
tables, enums, indexes, row level security, triggers, aggregate functions and
storage buckets.

**Run the sections in order** — later objects reference earlier ones. Either
paste the SQL blocks into **Dashboard → SQL Editor**, or:

```bash
supabase migration new initial_schema   # paste sections 2–11
supabase db push
```

Two ordering traps the document flags inline:

- The signup trigger (§4.4) references `expense_categories` (§7.1) and
  `notification_preferences` (§9). Create those tables first or the first signup
  fails.
- `transactions` (§5.2) has foreign keys to `invoices` and `expenses`. Create it
  after §6 and §7, or add those columns later with `alter table`.

Two optional extras:

- **Realtime** on the transactions page needs
  `alter publication supabase_realtime add table public.transactions;` (§5.2).
- **Revenue by stream** on the reports page needs the `invoice_items.stream`
  column added in §10.8. Without it that panel shows an empty state.

Section 12 seeds enough rows to make every page render something real. Section
13 is an RLS verification script — run it as a second user who does not belong
to the organisation and confirm every query returns zero rows.

### How tenancy works

Every business row carries an `organization_id`. All RLS reduces to one
question: *is the calling user a member of this organisation?* Get that right
once and every table inherits it.

A signup trigger creates the profile, the organisation, and the owner
membership together, so a new user lands in a working workspace rather than an
empty one.

---

## Project structure

```
src/
├── App.vue                     Router outlet with a fade transition
├── main.js                     App bootstrap
├── style.css                   Tailwind v4 theme tokens and base styles
│
├── router/
│   └── index.js                Routes, auth guard, page titles
│
├── lib/
│   └── supabaseClient.js       Configured Supabase client (PKCE flow)
│
├── services/                   ── Data access. One module per domain. ──
│   ├── helpers.js              unwrap(), error translation, pagination
│   ├── organizationService.js  Membership, org details, role checks
│   ├── dashboardService.js     Stats, cash flow, invoice buckets, activity
│   ├── invoiceService.js       Invoice CRUD, stats, clients
│   ├── expenseService.js       Expense CRUD, approvals, receipts, categories
│   ├── transactionService.js   Balances, ledger, reconciliation, realtime
│   ├── reportService.js        P&L, revenue mix, KPIs, period resolution
│   ├── payrollService.js       Runs, employees, approvals, history
│   ├── settingsService.js      Profile, company, notification preferences
│   └── index.js                Barrel re-export
│
├── composables/
│   ├── useAuth.js              Session state, sign in / up / out
│   ├── useOrganization.js      Current organisation, resolved once
│   └── usePortalData.js        Fetch + loading + error + refresh
│
├── pages/
│   ├── auth/
│   │   ├── login.vue
│   │   └── signup.vue
│   └── portal/
│       ├── dashboard.vue       Overview
│       ├── invoices.vue
│       ├── expenses.vue
│       ├── transactions.vue
│       ├── reports.vue
│       ├── payroll.vue
│       └── settings.vue
│
├── components/
│   ├── landing/                Marketing site
│   │   ├── LandingPage.vue     Composes the four below
│   │   ├── TheNavbar.vue
│   │   ├── HeroSection.vue
│   │   ├── DetailsSection.vue
│   │   └── TheFooter.vue
│   ├── auth/
│   │   └── AuthLayout.vue      Split-screen shell for login and signup
│   ├── portal/                 Portal chrome and shared widgets
│   │   ├── PortalLayout.vue    Sidebar + topbar + <RouterView>
│   │   ├── PortalSidebar.vue   Collapsible nav
│   │   ├── PortalTopbar.vue    Search, notifications, account menu
│   │   ├── PageHeader.vue
│   │   ├── AsyncState.vue      Skeleton / error+retry / content
│   │   ├── FilterTabs.vue
│   │   ├── SearchInput.vue
│   │   └── StatusPill.vue      One status → colour lookup
│   ├── dashboard/              Dashboard-specific widgets
│   │   ├── StatCard.vue
│   │   ├── CashFlowChart.vue
│   │   ├── InvoiceSummary.vue
│   │   └── RecentTransactions.vue
│   └── ui/
│       ├── BrandMark.vue       Wordmark, light and dark variants
│       └── FormField.vue       Labelled input with error and reveal
│
└── utils/
    ├── format.js               Cedi, dates, statuses, deltas, initials
    └── samplesData.js          Static UI config (nav, filters, tabs, copy)
```

---

## Architecture

Data flows one way, through four layers:

```
Supabase  →  services/  →  composables/  →  pages/  →  components/
             raw → shaped    async state     compose     render
```

### Services own every query

Nothing outside `src/services/` imports the Supabase client. Each module wraps
the tables and RPCs for one domain and returns UI-ready shapes — cedi strings,
formatted dates, title-case statuses — so components stay dumb.

Services **throw** on failure rather than returning `{ data, error }`, so pages
catch once instead of checking after every call. `helpers.js` translates
Postgres error codes into sentences a person can act on: a missing table says
*"Run supabase_schema.md against your project"*, not `42P01`.

Services import no Vue components. Icons are chosen in the page, because they
are presentation.

### Composables own async state

`usePortalData(fetcher, options)` resolves the current organisation, runs the
fetcher, and tracks `loading` / `error` / `refresh`:

```js
const { data, loading, error, refresh } = usePortalData(
  (orgId) => listInvoices(orgId, { filter: filter.value, search: query.value }),
  { initial: { rows: [], total: 0 }, watchSources: [filter, query] },
)
```

`watchSources` refetches when a filter changes. Out-of-order responses are
discarded, so fast typing cannot let a slow early request overwrite a fast later
one.

`useOrganization()` resolves the membership once per page load at module level
and shares it, so navigating between portal pages never re-queries it.

### Aggregates run in Postgres

Dashboard stats, cash flow, invoice buckets, P&L and payroll totals are SQL
functions (§10 of the schema), not client-side loops over fetched rows. The
client formats; the database counts.

---

## Routing and auth

| Path | Access | Renders |
| --- | --- | --- |
| `/` | Public | Marketing site |
| `/login`, `/signup` | Guests only | Auth pages |
| `/portal/dashboard` and siblings | Signed in | Portal, inside `PortalLayout` |
| `/dashboard` | — | Redirects to `/portal/dashboard` |
| anything else | — | Redirects to `/` |

Portal routes are children of a `/portal` layout route, so the sidebar and
topbar mount **once** and survive navigation — collapse state and scroll
position persist between pages.

The guard in `src/router/index.js`:

- Reads `requiresAuth` from `to.matched`, since it sits on the parent route
- Waits for `useAuth`'s `loading` flag before deciding, so a hard refresh inside
  the portal does not bounce a signed-in user to `/login`
- Redirects unauthenticated users to `/login?redirect=…`, and login honours that
  parameter so a deep link survives the round trip
- Sends already-signed-in users away from `/login` and `/signup`
- **Imports `useAuth` lazily and skips public routes entirely**, so the landing
  page loads even before `.env.local` is filled in

Sessions use the PKCE flow with auto-refresh and persistence. `useAuth` holds
module-level state so every component shares one session and the
`onAuthStateChange` listener registers exactly once.

Permissions are enforced in RLS, not in components. A `viewer` can file an
expense but not approve one — that rule holds even if someone calls the REST API
directly.

---

## Design system

Tailwind CSS v4, configured entirely in `src/style.css` via `@theme` — there is
no `tailwind.config.js`.

- **Palette** — a `brand-50…950` blue ramp on white, with `ink` / `ink-soft`
  navy text tones. Changing the brand is a one-file edit.
- **Custom utilities** — `container-page` (max width + responsive padding),
  `bg-grid` (blueprint texture behind the hero and auth panel).
- **Animations** — `float`, `rise`, `drift` (the hero particle field), all
  disabled under `prefers-reduced-motion`.
- **Icons** — [`lucide-vue-next`](https://lucide.dev). This is the Vue port;
  `lucide-react` will not render in an SFC.

Tailwind v4 canonical class names apply: `bg-linear-to-br` not
`bg-gradient-to-br`, `size-152` not `size-[38rem]`, `mask-[…]` not
`[mask-image:…]`.

Status colours live in exactly one place — `StatusPill.vue` — so a "Paid" pill
looks identical on invoices, transactions and payroll.

---

## Adding a new portal page

1. **Service** — add functions to the relevant `src/services/*.js`, or create a
   new module. Return UI-ready shapes; use `unwrap()` for every Supabase call.
2. **Page** — create `src/pages/portal/<name>.vue`, fetch with `usePortalData`,
   wrap each async section in `<AsyncState>` with the matching skeleton
   (`cards`, `table`, `chart`, `card`).
3. **Route** — add a child under `/portal` in `src/router/index.js` with a
   `meta.title`.
4. **Nav** — add an entry to `navItems` in `src/utils/samplesData.js`.

A minimal page:

```vue
<script setup>
import AsyncState from '../../components/portal/AsyncState.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
import { usePortalData } from '../../composables/usePortalData'
import { listThings } from '../../services/thingService'

const { data, loading, error, refresh } = usePortalData(
  (orgId) => listThings(orgId),
  { initial: [] },
)
</script>

<template>
  <div>
    <PageHeader title="Things" subtitle="What they are." />
    <AsyncState
      class="mt-7"
      :loading="loading"
      :error="error"
      skeleton="table"
      @retry="refresh"
    >
      <!-- content -->
    </AsyncState>
  </div>
</template>
```

---

## Conventions

**Money** — `numeric(14,2)` in Postgres, exact decimal, never `float8`.
Formatted for display only in `utils/format.js`. Base currency is `GHS`; the
column is a 3-letter ISO code so multi-currency stays possible.

**Signed amounts** — transactions store a signed `amount`: positive is money in,
negative is money out. `sum(amount)` stays meaningful.

**Naming** — Postgres is plural snake_case (`invoice_items`); JavaScript is
camelCase. Services translate at the boundary, so no snake_case leaks into
components.

**Deletes** — business records soft-delete via `archived_at`. Ledger history
survives.

**Static vs. fetched** — `utils/samplesData.js` holds only what has no database
representation: navigation, filter vocabularies, tab definitions, report-library
copy, notification labels. Every row of real data comes from a service.

**Accessibility** — one focus ring defined globally in `style.css`; toggle
switches are checkbox-backed so they stay keyboard and screen-reader accessible;
tables scroll horizontally inside their own container rather than letting the
page scroll sideways.

---

## Troubleshooting

**Blank portal pages, or "The database tables are missing"**
The schema has not been applied. Run `supabase_schema.md` in order.

**"A database function used by this page does not exist yet"**
Section 10 (aggregates) was skipped. Run it.

**"Your account is not attached to an organisation yet"**
The signup trigger (§4.4) was not created, or was created before
`expense_categories` and `notification_preferences` existed. Create the trigger,
then either sign up a fresh user or insert the organisation and membership rows
by hand.

**App throws on boot with a credentials error**
`.env.local` is missing or still holds placeholder values. Fill it in and
restart the dev server.

**Everything returns zero rows and no error**
That is RLS behaving correctly — you are querying an organisation you do not
belong to. Check `organization_members`.

**Realtime updates never arrive on the transactions page**
Run `alter publication supabase_realtime add table public.transactions;`.

---

## Known gaps

Honest list of what is scaffolded but not finished:

- **Buttons without handlers** — "New invoice", "Record expense", "Run payroll",
  "Export" and the report-library "Generate" actions render but do nothing yet.
  The service functions they need (`createInvoice`, `createExpense`,
  `createPayrollRun`) already exist; the forms do not.
- **Avatar upload** — `uploadAvatar` and `removeAvatar` exist in
  `settingsService.js`; the Profile tab's buttons are not wired to them.
- **OAuth** — social sign-in was removed from the auth pages. Re-add with
  `supabase.auth.signInWithOAuth()` once providers are enabled.
- **Single organisation** — `useOrganization` takes the first membership. Add a
  switcher when users need more than one.
- **Unused dependency** — `@supabase/server` is in `package.json` but nothing
  imports it. Safe to remove.
- **Unused assets** — `src/assets/` still holds the Vite starter images.
