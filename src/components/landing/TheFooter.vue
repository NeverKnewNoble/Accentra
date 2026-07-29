<script setup>
import BrandMark from '../ui/BrandMark.vue'

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Integrations', 'Pricing', 'Changelog', 'Security'],
  },
  {
    title: 'Solutions',
    links: ['Startups', 'Agencies', 'E-commerce', 'Accountants', 'Non-profits'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Help centre', 'Tax guides', 'API reference', 'Status'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Customers', 'Press kit', 'Contact'],
  },
]

const socials = [
  {
    name: 'X',
    path: 'M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.2L4.7 21H1.5l7.5-8.6L1 3h6.7l4.6 5.7L17.5 3Z',
  },
  {
    name: 'LinkedIn',
    path: 'M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4V21H3V9.5ZM9.5 9.5h3.8v1.6a4.2 4.2 0 0 1 3.7-2c3 0 4.5 1.9 4.5 5.3V21h-4v-5.9c0-1.6-.6-2.5-2-2.5s-2.2 1-2.2 2.6V21h-3.8V9.5Z',
  },
  {
    name: 'GitHub',
    path: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z',
  },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer id="footer" class="scroll-mt-24 border-t border-slate-200 bg-white">
    <div class="container-page py-16">
      <div class="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
        <!-- Brand + newsletter -->
        <div class="max-w-sm">
          <BrandMark />
          <p class="mt-5 text-[15px] leading-relaxed text-slate-600">
            The modern ledger for growing businesses. Invoicing, expenses, payroll
            and reporting — balanced in one place.
          </p>

          <form class="mt-7" @submit.prevent>
            <label for="footer-email" class="text-sm font-medium text-ink">
              Monthly finance digest
            </label>
            <div class="mt-2.5 flex gap-2">
              <input
                id="footer-email"
                type="email"
                placeholder="you@company.com"
                autocomplete="email"
                class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
              />
              <button
                type="submit"
                class="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
              >
                Subscribe
              </button>
            </div>
            <p class="mt-2 text-xs text-slate-400">
              One email a month. Unsubscribe whenever.
            </p>
          </form>
        </div>

        <!-- Link columns -->
        <div class="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div v-for="column in columns" :key="column.title">
            <h3 class="text-sm font-semibold text-ink">{{ column.title }}</h3>
            <ul class="mt-4 space-y-3">
              <li v-for="link in column.links" :key="link">
                <a
                  href="#"
                  class="text-sm text-slate-500 transition hover:text-brand-600"
                >
                  {{ link }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div
        class="mt-14 flex flex-col items-center gap-6 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between"
      >
        <p class="text-sm text-slate-400">
          © {{ year }} Accentra Inc. All rights reserved.
        </p>

        <div class="flex items-center gap-6">
          <ul class="flex items-center gap-5 text-sm text-slate-400">
            <li><a href="#" class="transition hover:text-brand-600">Privacy</a></li>
            <li><a href="#" class="transition hover:text-brand-600">Terms</a></li>
            <li><a href="#" class="transition hover:text-brand-600">Cookies</a></li>
          </ul>

          <ul class="flex items-center gap-2">
            <li v-for="social in socials" :key="social.name">
              <a
                href="#"
                :aria-label="social.name"
                class="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
              >
                <svg viewBox="0 0 24 24" class="size-4.5" fill="currentColor" aria-hidden="true">
                  <path :d="social.path" />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
