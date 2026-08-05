<script setup>
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'

/**
 * Placeholder rows for a portal table.
 *
 * Deliberately borderless on the outside — every table in the app already sits
 * inside a bordered section, and a second border would read as a nested card.
 * The paddings match the real `px-6 py-4` cells so nothing shifts on load.
 */
const props = defineProps({
  rows: { type: Number, default: 6 },
  columns: { type: Number, default: 5 },
  // First cell is an avatar/icon plus two stacked lines, as in most tables.
  avatar: { type: Boolean, default: true },
  head: { type: Boolean, default: true },
  // Trailing icon-button column (the "…" actions cell).
  actions: { type: Boolean, default: false },
})

// Columns between the identity cell and the right-aligned amount.
const middle = computed(() => Math.max(0, props.columns - 2))
</script>

<template>
  <div>
    <div
      v-if="head"
      class="flex items-center gap-4 border-b border-slate-100 px-6 py-3.5"
    >
      <SkeletonBlock class="h-2.5 w-20 flex-1" />
      <SkeletonBlock v-for="n in middle" :key="n" class="hidden h-2.5 w-16 sm:block" />
      <SkeletonBlock class="h-2.5 w-14" />
      <SkeletonBlock v-if="actions" class="h-2.5 w-8" />
    </div>

    <div
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-4 border-b border-slate-50 px-6 py-4 last:border-0"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <SkeletonBlock v-if="avatar" class="size-9 shrink-0 rounded-lg" />
        <div class="min-w-0 flex-1 space-y-2">
          <SkeletonBlock class="h-3 w-2/3 max-w-40" />
          <SkeletonBlock class="h-2.5 w-2/5 max-w-24" />
        </div>
      </div>

      <SkeletonBlock v-for="n in middle" :key="n" class="hidden h-3 w-16 sm:block" />
      <SkeletonBlock class="h-3 w-14" />
      <SkeletonBlock v-if="actions" class="size-8 rounded-lg" />
    </div>
  </div>
</template>
