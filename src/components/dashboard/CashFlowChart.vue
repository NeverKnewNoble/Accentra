<script setup>
import { ref } from 'vue'
import { cashFlowRanges } from '../../utils/samplesData'

// `months` arrives pre-normalised from dashboardService: inflow/outflow are
// 0–100 for bar height, with the real cedi figures alongside for tooltips.
defineProps({
  months: { type: Array, default: () => [] },
})
const emit = defineEmits(['range-change'])

const activeRange = ref('6M')

function selectRange(range) {
  activeRange.value = range
  emit('range-change', range)
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-ink">Cash flow</h2>
        <p class="mt-1 text-sm text-slate-500">Money in against money out</p>
      </div>

      <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        <button
          v-for="range in cashFlowRanges"
          :key="range"
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
          :class="
            activeRange === range
              ? 'bg-white text-ink shadow-sm'
              : 'text-slate-500 hover:text-ink'
          "
          @click="selectRange(range)"
        >
          {{ range }}
        </button>
      </div>
    </header>

    <div class="mt-5 flex items-center gap-5 text-xs text-slate-500">
      <span class="inline-flex items-center gap-2">
        <span class="size-2.5 rounded-full bg-brand-600"></span> Inflow
      </span>
      <span class="inline-flex items-center gap-2">
        <span class="size-2.5 rounded-full bg-brand-200"></span> Outflow
      </span>
    </div>

    <!-- Grouped bars. Pure markup — no chart library. -->
    <div v-if="months.length" class="mt-6 flex h-56 items-end gap-3 sm:gap-5">
      <div
        v-for="month in months"
        :key="month.label"
        class="group flex h-full flex-1 flex-col justify-end gap-2"
      >
        <div class="flex h-full items-end justify-center gap-1.5">
          <div
            class="w-full max-w-3.5 rounded-t-md bg-brand-600 transition-all duration-300 group-hover:bg-brand-700"
            :style="{ height: `${month.inflow}%` }"
            :title="`${month.label} in — ${month.inflowAmount}`"
          ></div>
          <div
            class="w-full max-w-3.5 rounded-t-md bg-brand-200 transition-all duration-300 group-hover:bg-brand-300"
            :style="{ height: `${month.outflow}%` }"
            :title="`${month.label} out — ${month.outflowAmount}`"
          ></div>
        </div>
        <span class="text-center text-[11px] font-medium text-slate-400">
          {{ month.label }}
        </span>
      </div>
    </div>

    <p v-else class="mt-6 flex h-56 items-center justify-center text-sm text-slate-400">
      No transactions in this period yet.
    </p>
  </section>
</template>
