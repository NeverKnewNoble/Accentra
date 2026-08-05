<script setup>
import SkeletonBlock from './SkeletonBlock.vue'

// The account switcher strip on /portal/transactions — balance cards that
// double as the filter control.
defineProps({
  count: { type: Number, default: 4 },
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div
      v-for="n in count"
      :key="n"
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <SkeletonBlock class="h-3 w-24" />
      <SkeletonBlock class="mt-3 h-6 w-32 rounded-lg" />
      <SkeletonBlock class="mt-2.5 h-2.5 w-36" />
    </div>
  </div>
</template>
