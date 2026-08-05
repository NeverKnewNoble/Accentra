<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Shape of the cash-flow card: heading, range switcher, legend, grouped bars.
defineProps({
  bars: { type: Number, default: 8 },
})

// Fixed heights rather than random ones — a skeleton that reshuffles itself on
// every re-render draws the eye to the wrong thing.
const HEIGHTS = [
  [62, 44],
  [78, 52],
  [45, 38],
  [88, 60],
  [54, 41],
  [70, 58],
  [92, 64],
  [58, 46],
]
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <SkeletonBlock class="h-4 w-28" />
        <SkeletonBlock class="h-3 w-44" />
      </div>
      <SkeletonBlock class="h-9 w-40 rounded-lg" />
    </header>

    <div class="mt-5 flex items-center gap-5">
      <SkeletonBlock class="h-2.5 w-20 rounded-full" />
      <SkeletonBlock class="h-2.5 w-20 rounded-full" />
    </div>

    <div class="mt-6 flex h-56 items-end gap-3 sm:gap-5">
      <div v-for="n in bars" :key="n" class="flex h-full flex-1 flex-col justify-end gap-2">
        <div class="flex h-full items-end justify-center gap-1.5">
          <!-- Two tones stand in for the inflow/outflow pair. -->
          <SkeletonBlock
            class="w-full max-w-3.5 rounded-t-md rounded-b-none bg-slate-200"
            :style="{ height: `${HEIGHTS[(n - 1) % HEIGHTS.length][0]}%` }"
          />
          <SkeletonBlock
            class="w-full max-w-3.5 rounded-t-md rounded-b-none"
            :style="{ height: `${HEIGHTS[(n - 1) % HEIGHTS.length][1]}%` }"
          />
        </div>
        <SkeletonBlock class="mx-auto h-2.5 w-7" />
      </div>
    </div>
  </section>
</template>
