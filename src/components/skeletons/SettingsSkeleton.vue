<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Section nav beside the active panel on /portal/settings. The form shape
// stands in for whichever tab is open — they share the same two-column grid.
defineProps({
  fields: { type: Number, default: 4 },
  tabs: { type: Number, default: 3 },
})
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
    <nav class="lg:sticky lg:top-24 lg:self-start">
      <ul class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        <li v-for="n in tabs" :key="n" class="shrink-0 lg:shrink">
          <div class="flex w-full items-center gap-3 px-3.5 py-2.5">
            <SkeletonBlock class="size-[18px] shrink-0 rounded" />
            <SkeletonBlock class="h-3 w-24" />
          </div>
        </li>
      </ul>
    </nav>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="space-y-2">
        <SkeletonBlock class="h-4 w-36" />
        <SkeletonBlock class="h-3 w-64" />
      </div>

      <!-- Avatar row -->
      <div class="mt-6 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-6">
        <SkeletonBlock class="size-16 rounded-2xl" />
        <div class="flex flex-wrap gap-2.5">
          <SkeletonBlock class="h-11 w-32 rounded-xl" />
          <SkeletonBlock class="h-11 w-24 rounded-xl" />
        </div>
      </div>

      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <div v-for="n in fields" :key="n" class="space-y-2">
          <SkeletonBlock class="h-3 w-24" />
          <SkeletonBlock class="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
</template>
