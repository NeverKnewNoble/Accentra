<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
import TableSkeleton from './TableSkeleton.vue'

// A bordered table panel with its own heading — "Recent transactions", "Team",
// "Profit and loss". `action` reserves the link that sits opposite the title.
defineProps({
  rows: { type: Number, default: 5 },
  columns: { type: Number, default: 4 },
  avatar: { type: Boolean, default: true },
  action: { type: Boolean, default: true },
})
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header
      class="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5"
    >
      <div class="space-y-2">
        <SkeletonBlock class="h-4 w-40" />
        <SkeletonBlock class="h-3 w-56" />
      </div>
      <SkeletonBlock v-if="action" class="h-3 w-16 shrink-0" />
    </header>

    <TableSkeleton :rows="rows" :columns="columns" :avatar="avatar" />
  </section>
</template>
