<script setup>
import BrandMark from '../ui/BrandMark.vue'

// Split-screen auth shell: a blue brand panel on the left (desktop only) and
// the form column on the right. Login and signup differ only in the copy and
// the proof points they pass in.
defineProps({
  eyebrow: { type: String, default: '' },
  headline: { type: String, required: true },
  subhead: { type: String, default: '' },
  points: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
    <!-- Brand panel -->
    <aside
      class="relative hidden overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12"
    >
      <div class="bg-grid absolute inset-0 opacity-[0.35]" aria-hidden="true"></div>
      <div
        class="absolute -top-24 -right-24 size-96 rounded-full bg-brand-400/30 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="absolute -bottom-32 -left-20 size-96 rounded-full bg-sky-300/20 blur-3xl"
        aria-hidden="true"
      ></div>

      <div class="relative">
        <BrandMark variant="light" />
      </div>

      <div class="relative max-w-md">
        <p
          v-if="eyebrow"
          class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-brand-100 uppercase ring-1 ring-white/20"
        >
          {{ eyebrow }}
        </p>
        <h2 class="text-4xl leading-[1.15] font-semibold tracking-tight text-white">
          {{ headline }}
        </h2>
        <p v-if="subhead" class="mt-4 text-[15px] leading-relaxed text-brand-100">
          {{ subhead }}
        </p>

        <ul v-if="points.length" class="mt-8 space-y-3.5">
          <li
            v-for="point in points"
            :key="point"
            class="flex items-start gap-3 text-sm text-brand-50"
          >
            <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/15">
              <svg viewBox="0 0 24 24" class="size-3" fill="none" stroke="white" stroke-width="3" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            {{ point }}
          </li>
        </ul>
      </div>

      <figure class="relative max-w-md rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
        <blockquote class="text-sm leading-relaxed text-white">
          “We closed our books four days faster in the first month. Accentra is the
          only ledger our accountant asks for by name.”
        </blockquote>
        <!-- <figcaption class="mt-4 flex items-center gap-3">
          <span class="grid size-9 place-items-center rounded-full bg-white/20 text-xs font-semibold text-white">
            AO
          </span>
          <span class="text-xs text-brand-100">
            <span class="block font-medium text-white">Ama Owusu</span>
            Finance Lead, Northwind Retail
          </span>
        </figcaption> -->
      </figure>
    </aside>

    <!-- Form column -->
    <main class="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
      <div class="flex items-center justify-between lg:hidden">
        <BrandMark />
      </div>

      <div class="flex flex-1 items-center justify-center py-10">
        <div class="w-full max-w-104 animate-rise">
          <slot />
        </div>
      </div>

      <p class="text-center text-xs text-slate-400">
        © {{ new Date().getFullYear() }} Accentra ·
        <a href="#" class="hover:text-brand-600">Privacy</a> ·
        <a href="#" class="hover:text-brand-600">Terms</a>
      </p>
    </main>
  </div>
</template>
