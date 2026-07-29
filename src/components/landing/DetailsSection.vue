<script setup>
// Icons are inline SVG paths so the landing page ships without an icon library.
const features = [
  {
    title: 'Smart reconciliation',
    body: 'Connect your banks once. Accentra matches statements to entries automatically and flags only what genuinely needs a human.',
    path: 'M4 7h16M4 12h10M4 17h7M15.5 16.5l2.5 2.5 4-4.5',
  },
  {
    title: 'Invoices that get paid',
    body: 'Branded invoices, recurring billing and polite automatic reminders — with payment links your clients can settle in two taps.',
    path: 'M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17ZM9.5 9h5M9.5 13h5',
  },
  {
    title: 'Live reporting',
    body: 'P&L, balance sheet and cash-flow statements that recalculate the moment a transaction lands. No overnight batch, no stale numbers.',
    path: 'M4 19.5V5M4 19.5h16M8 16v-4M12.5 16V8M17 16v-6',
  },
  {
    title: 'Tax on autopilot',
    body: 'VAT, withholding and payroll taxes computed per jurisdiction, with filing-ready exports your accountant can open as-is.',
    path: 'M12 3.5 4.5 6.5v5c0 4.4 3.1 8.3 7.5 9.5 4.4-1.2 7.5-5.1 7.5-9.5v-5L12 3.5ZM9 12l2.2 2.2L15.5 10',
  },
  {
    title: 'Multi-currency ledger',
    body: 'Bill in 40+ currencies with daily rates and automatic FX gain/loss postings. One consolidated view in your base currency.',
    path: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM2.5 12h19M12 2.5c4.5 5.2 4.5 13.8 0 19-4.5-5.2-4.5-13.8 0-19Z',
  },
  {
    title: 'Roles and audit trail',
    body: 'Give bookkeepers, approvers and auditors exactly the access they need. Every edit is versioned and attributable.',
    path: 'M12 3.5 5 6v5.5c0 4 2.8 7.7 7 9 4.2-1.3 7-5 7-9V6l-7-2.5ZM12 10.5v3M12 16.5h.01',
  },
]

const steps = [
  {
    n: '01',
    title: 'Connect your accounts',
    body: 'Link banks, card providers and your payment processor through a secure read-only connection. Historical data imports on the spot.',
  },
  {
    n: '02',
    title: 'Let the ledger organise itself',
    body: 'Rules and pattern-matching categorise transactions as they arrive. You review the exceptions — usually a handful a week.',
  },
  {
    n: '03',
    title: 'Close, file and report',
    body: 'Run the close checklist, export filing-ready statements and share a live dashboard with your accountant or board.',
  },
]
</script>

<template>
  <div>
    <!-- Features -->
    <section id="features" class="scroll-mt-24 py-20 sm:py-28">
      <div class="container-page">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-xs font-semibold tracking-[0.16em] text-brand-600 uppercase">
            Everything in one ledger
          </p>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            The details your accountant cares about — handled
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-pretty text-slate-600">
            Accentra replaces the spreadsheet stack with a single system of record,
            built around how finance teams actually work.
          </p>
        </div>

        <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
          >
            <span
              class="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"
            >
              <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path :d="feature.path" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold tracking-tight text-ink">
              {{ feature.title }}
            </h3>
            <p class="mt-2.5 text-[15px] leading-relaxed text-slate-600">
              {{ feature.body }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="scroll-mt-24 bg-slate-50/70 py-20 sm:py-28">
      <div class="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <p class="text-xs font-semibold tracking-[0.16em] text-brand-600 uppercase">
            How it works
          </p>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            Live in an afternoon, not a quarter
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-pretty text-slate-600">
            No migration consultants, no six-week onboarding. Most teams run their
            first close on Accentra within a week of signing up.
          </p>
          <RouterLink
            to="/signup"
            class="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.99]"
          >
            Create your workspace
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 12h13m0 0-5-5m5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </div>

        <ol class="relative space-y-4">
          <li
            v-for="step in steps"
            :key="step.n"
            class="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-card"
          >
            <span
              class="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white"
            >
              {{ step.n }}
            </span>
            <span>
              <h3 class="text-base font-semibold text-ink">{{ step.title }}</h3>
              <p class="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                {{ step.body }}
              </p>
            </span>
          </li>
        </ol>
      </div>
    </section>

    <!-- Closing CTA -->
    <section id="pricing" class="scroll-mt-24 py-20 sm:py-28">
      <div class="container-page">
        <div
          class="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 px-8 py-16 text-center sm:px-16"
        >
          <div class="bg-grid absolute inset-0 opacity-30" aria-hidden="true"></div>
          <div class="absolute -top-24 -right-16 size-80 rounded-full bg-brand-400/30 blur-3xl" aria-hidden="true"></div>

          <div class="relative mx-auto max-w-2xl">
            <h2 class="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              Start free. Pay only when your books outgrow the plan.
            </h2>
            <p class="mt-4 text-lg text-pretty text-brand-100">
              Full access for 14 days — every feature, no card, no sales call.
              Plans from ₵19 per month after that.
            </p>
            <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <RouterLink
                to="/signup"
                class="inline-flex w-full items-center justify-center rounded-xl bg-white px-7 py-4 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 active:scale-[0.99] sm:w-auto"
              >
                Create free account
              </RouterLink>
              <RouterLink
                to="/login"
                class="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Sign in
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
