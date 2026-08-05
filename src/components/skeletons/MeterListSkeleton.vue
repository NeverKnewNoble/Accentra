<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Card of labelled progress meters — the "Spend by category" panel.
defineProps({
  rows: { type: Number, default: 4 },
})

const FILLS = ['w-4/5', 'w-3/5', 'w-2/5', 'w-1/4', 'w-1/5']
</script>

<template>
  <section class="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header class="space-y-2">
      <SkeletonBlock class="h-4 w-44" />
      <SkeletonBlock class="h-3 w-24" />
    </header>

    <ul class="mt-6 space-y-5">
      <li v-for="n in rows" :key="n">
        <div class="flex items-baseline justify-between gap-3">
          <SkeletonBlock class="h-3 w-28" />
          <SkeletonBlock class="h-3 w-16" />
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <!-- Darker than the track, or the fill would vanish into it. -->
          <SkeletonBlock
            class="h-full rounded-full bg-slate-200"
            :class="FILLS[(n - 1) % FILLS.length]"
          />
        </div>
        <SkeletonBlock class="mt-2 h-2.5 w-32" />
      </li>
    </ul>
  </section>
</template>
