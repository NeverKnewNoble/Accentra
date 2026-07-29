<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BrandMark from '../ui/BrandMark.vue'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Support', href: '#footer' },
]

const scrolled = ref(false)
const open = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="sticky top-0 z-50 transition-all duration-300"
    :class="scrolled ? 'border-b border-slate-200/70 bg-white/85 backdrop-blur-xl' : 'bg-transparent'"
  >
    <nav class="container-page flex h-18 items-center justify-between">
      <BrandMark />

      <ul class="hidden items-center gap-1 md:flex">
        <li v-for="link in links" :key="link.href">
          <a
            :href="link.href"
            class="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>

      <div class="hidden items-center gap-2 md:flex">
        <RouterLink
          to="/login"
          class="rounded-lg px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-100"
        >
          Sign in
        </RouterLink>
        <RouterLink
          to="/signup"
          class="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98]"
        >
          Start free
        </RouterLink>
      </div>

      <button
        type="button"
        class="grid size-10 place-items-center rounded-lg text-ink transition hover:bg-slate-100 md:hidden"
        :aria-expanded="open"
        aria-label="Toggle navigation"
        @click="open = !open"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path v-if="!open" d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          <path v-else d="m6 6 12 12M18 6 6 18" stroke-linecap="round" />
        </svg>
      </button>
    </nav>

    <!-- Mobile sheet -->
    <div
      v-show="open"
      class="border-t border-slate-200 bg-white px-5 pb-6 md:hidden"
    >
      <ul class="py-2">
        <li v-for="link in links" :key="link.href">
          <a
            :href="link.href"
            class="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-brand-50"
            @click="open = false"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
      <div class="grid gap-2.5">
        <RouterLink
          to="/login"
          class="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-ink"
        >
          Sign in
        </RouterLink>
        <RouterLink
          to="/signup"
          class="rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Start free
        </RouterLink>
      </div>
    </div>
  </header>
</template>
