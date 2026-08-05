<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// Mirrors the StatCard grid: icon tile, delta pill, label, figure, caption.
defineProps({
  count: { type: Number, default: 4 },
})
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
    <article
      v-for="n in count"
      :key="n"
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div class="flex items-start justify-between">
        <SkeletonBlock class="size-10 rounded-xl" />
        <SkeletonBlock class="h-6 w-16 rounded-full" />
      </div>

      <SkeletonBlock class="mt-4 h-3 w-28" />
      <SkeletonBlock class="mt-2.5 h-7 w-36 rounded-lg" />
      <SkeletonBlock class="mt-2.5 h-2.5 w-40" />
    </article>
  </div>
</template>
