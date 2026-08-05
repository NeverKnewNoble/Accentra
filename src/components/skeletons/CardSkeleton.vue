<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
import SkeletonText from './SkeletonText.vue'

// Generic panel placeholder — a heading pair over a few lines of body.
defineProps({
  lines: { type: Number, default: 4 },
  title: { type: Boolean, default: true },
})
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header v-if="title" class="mb-6 space-y-2">
      <SkeletonBlock class="h-4 w-40" />
      <SkeletonBlock class="h-3 w-56" />
    </header>
    <SkeletonText :lines="lines" />
  </section>
</template>
