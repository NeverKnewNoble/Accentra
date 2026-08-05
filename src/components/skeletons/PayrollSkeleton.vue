<script setup>
import SkeletonBlock from './SkeletonBlock.vue'
import StatCardsSkeleton from './StatCardsSkeleton.vue'
import TableCardSkeleton from './TableCardSkeleton.vue'

// Whole body of /portal/payroll: stats, the run in flight with its checklist,
// the team table and the history rail.
</script>

<template>
  <div>
    <StatCardsSkeleton />

    <!-- Upcoming run -->
    <section class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="grid gap-px bg-slate-200 lg:grid-cols-[1.2fr_1fr]">
        <div class="bg-white p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <SkeletonBlock class="h-4 w-48" />
              <SkeletonBlock class="h-3 w-56" />
            </div>
            <SkeletonBlock class="h-6 w-20 rounded-full" />
          </div>

          <dl class="mt-6 grid gap-5 sm:grid-cols-3">
            <div v-for="n in 3" :key="n">
              <SkeletonBlock class="h-2.5 w-16" />
              <SkeletonBlock class="mt-2 h-5 w-24 rounded-lg" />
            </div>
          </dl>
        </div>

        <div class="bg-white p-6">
          <SkeletonBlock class="h-3.5 w-28" />
          <ol class="mt-4 space-y-3.5">
            <li v-for="n in 4" :key="n" class="flex items-center gap-3">
              <SkeletonBlock class="size-6 shrink-0 rounded-full" />
              <SkeletonBlock class="h-3 flex-1 max-w-56" />
            </li>
          </ol>
          <SkeletonBlock class="mt-6 h-11 w-full rounded-xl" />
        </div>
      </div>
    </section>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <TableCardSkeleton :rows="5" :columns="5" />

      <!-- Previous runs -->
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header class="space-y-2">
          <SkeletonBlock class="h-4 w-36" />
          <SkeletonBlock class="h-3 w-52" />
        </header>

        <ul class="mt-5 space-y-3">
          <li v-for="n in 3" :key="n" class="rounded-xl border border-slate-200 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-2">
                <SkeletonBlock class="h-3.5 w-28" />
                <SkeletonBlock class="h-2.5 w-40" />
              </div>
              <SkeletonBlock class="h-6 w-16 shrink-0 rounded-full" />
            </div>
            <div class="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
              <SkeletonBlock class="h-2.5 w-16" />
              <SkeletonBlock class="h-3 w-20" />
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
