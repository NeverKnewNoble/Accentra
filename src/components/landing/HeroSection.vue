<script setup>
// Bars for the mock "Cash flow" chart in the product preview — plain data so
// the visual stays pure markup (no image asset, no chart library).
const bars = [42, 58, 36, 71, 54, 88, 66, 95]

const ledger = [
  { name: 'Stripe payout', meta: 'Revenue · Today', amount: '+ ₵12,480.00', positive: true },
  { name: 'AWS invoice', meta: 'Infrastructure · Yesterday', amount: '− ₵1,204.55', positive: false },
  { name: 'Northwind Ltd', meta: 'Invoice #2201 · 2 days ago', amount: '+ ₵8,900.00', positive: true },
]

// Ambient blue particles drifting behind the hero. Values are hand-tuned
// rather than random so the layout is deterministic across renders — each dot
// gets its own size, position, speed and delay so the field never pulses in
// unison. `left`/`top` are percentages, `size` is px, times are seconds.
const particles = [
  { left: 6, top: 74, size: 8, delay: 0, duration: 15, opacity: 0.5, blur: false },
  { left: 13, top: 28, size: 5, delay: 2.4, duration: 19, opacity: 0.45, blur: false },
  { left: 19, top: 88, size: 14, delay: 5.1, duration: 22, opacity: 0.28, blur: true },
  { left: 25, top: 48, size: 4, delay: 1.2, duration: 17, opacity: 0.55, blur: false },
  { left: 32, top: 16, size: 10, delay: 7.3, duration: 24, opacity: 0.3, blur: true },
  { left: 38, top: 66, size: 6, delay: 3.6, duration: 16, opacity: 0.5, blur: false },
  { left: 45, top: 92, size: 5, delay: 9.2, duration: 21, opacity: 0.4, blur: false },
  { left: 52, top: 34, size: 12, delay: 4.4, duration: 26, opacity: 0.25, blur: true },
  { left: 58, top: 78, size: 4, delay: 6.8, duration: 18, opacity: 0.55, blur: false },
  { left: 64, top: 22, size: 7, delay: 0.8, duration: 20, opacity: 0.42, blur: false },
  { left: 71, top: 58, size: 16, delay: 8.5, duration: 28, opacity: 0.22, blur: true },
  { left: 77, top: 86, size: 5, delay: 2.9, duration: 17, opacity: 0.5, blur: false },
  { left: 83, top: 40, size: 9, delay: 5.7, duration: 23, opacity: 0.35, blur: true },
  { left: 88, top: 12, size: 4, delay: 10.4, duration: 19, opacity: 0.5, blur: false },
  { left: 93, top: 70, size: 6, delay: 3.1, duration: 25, opacity: 0.45, blur: false },
  { left: 97, top: 36, size: 11, delay: 6.2, duration: 27, opacity: 0.26, blur: true },
]
</script>

<template>
  <section class="relative overflow-hidden pt-10 pb-20 sm:pt-16 lg:pt-20 lg:pb-28">
    <!-- Ambient background -->
    <div class="bg-grid absolute inset-0 -z-10 mask-[radial-gradient(75%_55%_at_50%_0%,black,transparent)]" aria-hidden="true"></div>
    <div class="absolute -top-40 left-1/2 -z-10 size-152 -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" aria-hidden="true"></div>
    <div class="absolute top-40 -right-40 -z-10 size-104 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true"></div>

    <!-- Drifting blue particles -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span
        v-for="(p, i) in particles"
        :key="i"
        class="absolute rounded-full bg-brand-500"
        :class="p.blur ? 'blur-[3px]' : ''"
        :style="{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          opacity: 0,
          '--particle-opacity': p.opacity,
          animation: `drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }"
      ></span>
    </div>

    <div class="container-page grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <!-- Copy -->
      <div class="animate-rise text-center lg:text-left">
        <h1 class="text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-6xl">
          Accounting that keeps
          <span class="bg-linear-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
            perfect time
          </span>
          with your business.
        </h1>

        <p class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-600 lg:mx-0">
          Accentra unifies invoicing, expenses, payroll and reporting in one clean
          ledger — so month-end close takes an afternoon, not a fortnight.
        </p>

        <div class="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <RouterLink
            to="/signup"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 active:scale-[0.99] sm:w-auto"
          >
            Start free for 14 days
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 12h13m0 0-5-5m5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
          <a
            href="#how-it-works"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-ink shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            <svg viewBox="0 0 24 24" class="size-4 text-brand-600" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
            See how it works
          </a>
        </div>

        <p class="mt-5 text-sm text-slate-500">
          No credit card required · Cancel anytime
        </p>
      </div>

      <!-- Product preview -->
      <div class="relative animate-rise [animation-delay:120ms]">
        <div
          class="absolute -inset-4 -z-10 rounded-4xl bg-linear-to-tr from-brand-500/20 to-sky-300/20 blur-2xl"
          aria-hidden="true"
        ></div>

        <div class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-500">Net cash position</p>
              <p class="mt-1 text-3xl font-semibold tracking-tight text-ink">₵248,910</p>
            </div>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M6 15l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              12.4%
            </span>
          </div>

          <div class="mt-6 flex h-32 items-end gap-2.5">
            <div
              v-for="(bar, i) in bars"
              :key="i"
              class="flex-1 rounded-t-md transition-all duration-500 hover:opacity-80"
              :class="i === bars.length - 1 ? 'bg-brand-600' : 'bg-brand-100'"
              :style="{ height: `${bar}%` }"
            ></div>
          </div>
          <div class="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>Jan</span><span>Aug</span>
          </div>

          <div class="mt-6 space-y-1 border-t border-slate-100 pt-5">
            <p class="mb-2 text-xs font-medium text-slate-500">Recent activity</p>
            <div
              v-for="row in ledger"
              :key="row.name"
              class="flex items-center justify-between rounded-xl px-2 py-2.5 transition hover:bg-slate-50"
            >
              <span class="flex items-center gap-3">
                <span
                  class="grid size-9 place-items-center rounded-lg"
                  :class="row.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                >
                  <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                    <path
                      :d="row.positive ? 'M12 19V5m0 0-6 6m6-6 6 6' : 'M12 5v14m0 0 6-6m-6 6-6-6'"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="text-left">
                  <span class="block text-sm font-medium text-ink">{{ row.name }}</span>
                  <span class="block text-xs text-slate-400">{{ row.meta }}</span>
                </span>
              </span>
              <span
                class="text-sm font-semibold tabular-nums"
                :class="row.positive ? 'text-emerald-600' : 'text-slate-600'"
              >
                {{ row.amount }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
