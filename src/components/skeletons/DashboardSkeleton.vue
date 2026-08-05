<script setup>
import ChartSkeleton from './ChartSkeleton.vue'
import LegendListSkeleton from './LegendListSkeleton.vue'
import StatCardsSkeleton from './StatCardsSkeleton.vue'
import TableCardSkeleton from './TableCardSkeleton.vue'

// Whole body of /portal/dashboard. The grid tracks match the real page, so the
// layout does not jump when the data lands.
</script>

<template>
  <div>
    <StatCardsSkeleton />

    <div class="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <ChartSkeleton />
      <LegendListSkeleton footer />
    </div>

    <div class="mt-6">
      <TableCardSkeleton :columns="4" />
    </div>
  </div>
</template>
