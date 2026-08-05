<script setup>
import { computed, ref } from 'vue'
import {
  ArrowRight,
  ChartColumn,
  CreditCard,
  Download,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-vue-next'
import StatCard from '../../components/dashboard/StatCard.vue'
import AsyncState from '../../components/portal/AsyncState.vue'
import FilterTabs from '../../components/portal/FilterTabs.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
import ReportsSkeleton from '../../components/skeletons/ReportsSkeleton.vue'
import { usePortalData } from '../../composables/usePortalData'
import { getReportPageData } from '../../services/reportService'
import { reportLibrary, reportPeriods } from '../../utils/samplesData'

const period = ref('Year to date')

// One fetch for the whole page — the KPIs are derived from the same P&L rows
// as the table, so splitting them could let the two disagree.
const { data, loading, error, refresh } = usePortalData(
  (orgId) => getReportPageData(orgId, period.value),
  { watchSources: [period] },
)

const kpiCards = computed(() => {
  const kpis = data.value?.kpis
  if (!kpis) return []
  return [
    {
      label: 'Revenue',
      value: kpis.revenue,
      delta: kpis.revenueDelta,
      up: kpis.revenueUp,
      good: kpis.revenueUp,
      icon: Landmark,
      caption: period.value,
    },
    {
      label: 'Net margin',
      value: kpis.margin,
      delta: kpis.marginDelta,
      up: kpis.marginUp,
      good: kpis.marginUp,
      icon: ChartColumn,
      caption: 'Against the same period last year',
    },
    {
      label: 'Operating expenses',
      value: kpis.expenses,
      delta: kpis.expensesDelta,
      up: kpis.expensesUp,
      good: !kpis.expensesUp,
      icon: CreditCard,
      caption: 'Approved and reimbursed claims',
    },
    {
      label: 'Net profit',
      value: kpis.profit,
      delta: kpis.profitDelta,
      up: kpis.profitUp,
      good: kpis.profitUp,
      icon: Wallet,
      caption: kpis.netMargin,
    },
  ]
})

const STREAM_TONES = ['bg-brand-700', 'bg-brand-500', 'bg-brand-300', 'bg-brand-200']
</script>

<template>
  <div>
    <PageHeader title="Reports" subtitle="Statements that recalculate the moment a transaction lands.">
      <FilterTabs v-model="period" :options="reportPeriods" />
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
      >
        <Download class="size-4 text-slate-400" />
        Download pack
      </button>
    </PageHeader>

    <AsyncState
      class="mt-7 block"
      :loading="loading"
      :error="error"
      @retry="refresh"
    >
      <template #skeleton><ReportsSkeleton /></template>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard v-for="kpi in kpiCards" :key="kpi.label" v-bind="kpi" />
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <!-- Profit and loss -->
        <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 class="text-base font-semibold text-ink">Profit and loss</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ period }} against the same period last year
              </p>
            </div>
            <button
              type="button"
              class="text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
            >
              Full statement
            </button>
          </header>

          <div class="overflow-x-auto">
            <table class="w-full min-w-xl text-left">
              <thead>
                <tr class="border-b border-slate-100 text-xs text-slate-400">
                  <th scope="col" class="px-6 py-3 font-medium">Line item</th>
                  <th scope="col" class="px-6 py-3 text-right font-medium">Current</th>
                  <th scope="col" class="px-6 py-3 text-right font-medium">Prior year</th>
                  <th scope="col" class="px-6 py-3 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in data?.profitAndLoss ?? []"
                  :key="row.line"
                  class="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                  :class="row.emphasis ? 'bg-slate-50/60' : ''"
                >
                  <td
                    class="px-6 py-3.5 text-sm"
                    :class="row.emphasis ? 'font-semibold text-ink' : 'text-slate-600'"
                  >
                    {{ row.line }}
                  </td>
                  <td
                    class="px-6 py-3.5 text-right text-sm whitespace-nowrap tabular-nums"
                    :class="row.emphasis ? 'font-semibold text-ink' : 'text-slate-600'"
                  >
                    {{ row.current }}
                  </td>
                  <td class="px-6 py-3.5 text-right text-sm whitespace-nowrap text-slate-400 tabular-nums">
                    {{ row.prior }}
                  </td>
                  <td class="px-6 py-3.5 text-right">
                    <span
                      class="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                      :class="row.up ? 'text-emerald-600' : 'text-red-600'"
                    >
                      <component :is="row.up ? TrendingUp : TrendingDown" class="size-3.5" />
                      {{ row.change }}
                    </span>
                  </td>
                </tr>

                <tr v-if="!data?.profitAndLoss?.length">
                  <td colspan="4" class="px-6 py-14 text-center">
                    <p class="text-sm font-medium text-ink">Nothing to report yet</p>
                    <p class="mt-1 text-sm text-slate-500">
                      Raise an invoice or record an expense in this period.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Revenue mix -->
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h2 class="text-base font-semibold text-ink">Revenue by stream</h2>
            <p class="mt-1 text-sm text-slate-500">{{ period }}</p>
          </header>

          <template v-if="data?.streams?.length">
            <div class="mt-6 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                v-for="(stream, i) in data.streams"
                :key="stream.label"
                class="h-full transition-all duration-500"
                :class="STREAM_TONES[i % STREAM_TONES.length]"
                :style="{ width: `${stream.share}%` }"
              ></div>
            </div>

            <ul class="mt-6 space-y-4">
              <li
                v-for="(stream, i) in data.streams"
                :key="stream.label"
                class="flex items-center justify-between gap-3"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :class="STREAM_TONES[i % STREAM_TONES.length]"
                  ></span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-ink">{{ stream.label }}</span>
                    <span class="block text-xs text-slate-400">{{ stream.share }}% of revenue</span>
                  </span>
                </span>
                <span class="shrink-0 text-sm font-semibold text-ink tabular-nums">
                  {{ stream.amount }}
                </span>
              </li>
            </ul>
          </template>

          <p v-else class="mt-6 text-sm text-slate-400">
            Tag invoice lines with a stream to see this breakdown.
          </p>
        </section>
      </div>
    </AsyncState>

    <!-- Report library: a static catalogue, nothing to fetch -->
    <section class="mt-6">
      <h2 class="text-base font-semibold text-ink">Report library</h2>
      <p class="mt-1 text-sm text-slate-500">Generate any statement for a period of your choosing.</p>

      <div class="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="report in reportLibrary"
          :key="report.title"
          class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
        >
          <span
            class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"
          >
            <component :is="report.icon" class="size-5" />
          </span>
          <h3 class="mt-4 text-base font-semibold text-ink">{{ report.title }}</h3>
          <p class="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{{ report.body }}</p>
          <div class="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition group-hover:gap-2.5"
            >
              Generate
              <ArrowRight class="size-4" />
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
