<script setup>
import LegendListSkeleton from './LegendListSkeleton.vue'
import StatCardsSkeleton from './StatCardsSkeleton.vue'
import TableCardSkeleton from './TableCardSkeleton.vue'

// KPI row, profit-and-loss table and the revenue mix on /portal/reports. The
// report library below them is static copy, so it never needs a placeholder.
</script>

<template>
  <div>
    <StatCardsSkeleton />

    <div class="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <TableCardSkeleton :rows="7" :columns="4" :avatar="false" />
      <LegendListSkeleton :rows="4" />
    </div>
  </div>
</template>
