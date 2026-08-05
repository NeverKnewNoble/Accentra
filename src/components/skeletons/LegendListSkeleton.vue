<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// One stacked bar over a legend — the invoice-status and revenue-by-stream
// panels. `footer` adds the full-width button the invoice card ends with.
defineProps({
  rows: { type: Number, default: 3 },
  footer: { type: Boolean, default: false },
})
</script>

<template>
  <section class="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header class="space-y-2">
      <SkeletonBlock class="h-4 w-36" />
      <SkeletonBlock class="h-3 w-48" />
    </header>

    <div class="mt-6 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
      <!-- Two segments, darker than the track so they read as filled. -->
      <SkeletonBlock class="h-full w-1/2 rounded-none bg-slate-300" />
      <div class="w-px shrink-0 bg-white"></div>
      <SkeletonBlock class="h-full w-1/3 rounded-none bg-slate-200" />
    </div>

    <ul class="mt-6 space-y-4">
      <li v-for="n in rows" :key="n" class="flex items-center justify-between gap-3">
        <span class="flex min-w-0 flex-1 items-center gap-3">
          <SkeletonBlock class="size-4 shrink-0 rounded-full" />
          <span class="min-w-0 flex-1 space-y-2">
            <SkeletonBlock class="h-3 w-2/3 max-w-32" />
            <SkeletonBlock class="h-2.5 w-1/2 max-w-24" />
          </span>
        </span>
        <SkeletonBlock class="h-3 w-16 shrink-0" />
      </li>
    </ul>

    <SkeletonBlock v-if="footer" class="mt-6 h-11 w-full rounded-xl" />
  </section>
</template>
