<script setup>
import { Landmark } from 'lucide-vue-next'

// The Accentra wordmark. `variant="light"` renders for dark/blue backgrounds.
// Swap `Landmark` for any other lucide icon to change the mark.
defineProps({
  variant: { type: String, default: 'dark' },
  to: { type: String, default: '/' },
})
</script>

<template>
  <RouterLink :to="to" class="group inline-flex items-center gap-2.5">
    <span
      class="grid size-9 place-items-center rounded-xl shadow-sm transition group-hover:scale-105"
      :class="
        variant === 'light'
          ? 'bg-white/15 ring-1 ring-white/30 backdrop-blur'
          : 'bg-linear-to-br from-brand-500 to-brand-700'
      "
    >
      <Landmark class="size-5 text-white" :stroke-width="2" aria-hidden="true" />
    </span>
    <span
      class="text-lg font-semibold tracking-tight"
      :class="variant === 'light' ? 'text-white' : 'text-ink'"
    >
      Accentra
    </span>
  </RouterLink>
</template>
