<script setup>
import { computed, ref } from 'vue'
import { CreditCard, Download, FileText, Landmark, Wallet } from 'lucide-vue-next'
import CashFlowChart from '../../components/dashboard/CashFlowChart.vue'
import InvoiceSummary from '../../components/dashboard/InvoiceSummary.vue'
import RecentTransactions from '../../components/dashboard/RecentTransactions.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import ExportModal from '../../components/modals/ExportModal.vue'
import AsyncState from '../../components/portal/AsyncState.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton.vue'
import { useAuth } from '../../composables/useAuth'
import { usePortalData } from '../../composables/usePortalData'
import { getDashboardData } from '../../services/dashboardService'

const { user } = useAuth()

const { data, loading, error, refresh } = usePortalData((orgId) => getDashboardData(orgId))

const firstName = computed(() => {
  const handle = (user.value?.email ?? '').split('@')[0] || ''
  const first = handle.split(/[._-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
})

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/**
 * Icons live here rather than in the service — they are presentation, and the
 * service layer should stay free of Vue components.
 *
 * Every figure on this page is **cash**: `dashboard_stats` sums `transactions`,
 * so these are movements in and out of your accounts. Reports works on an
 * accrual basis instead — revenue when invoiced, costs when incurred — so the
 * two pages will legitimately differ. The captions say which is which, because
 * an unexplained gap reads as a bug.
 */
const statCards = computed(() => {
  const stats = data.value?.stats
  if (!stats) return []

  return [
    {
      label: 'Net cash position',
      value: stats.netCash,
      icon: Wallet,
      caption: `Across ${stats.accountCount} connected account${stats.accountCount === 1 ? '' : 's'}`,
    },
    {
      label: 'Cash received this month',
      value: stats.revenue,
      delta: stats.revenueDelta,
      up: stats.revenueUp,
      good: stats.revenueUp,
      icon: Landmark,
      caption: `Money in · vs ${stats.revenueLastMonth} last month`,
    },
    {
      label: 'Cash spent this month',
      value: stats.expenses,
      delta: stats.expensesDelta,
      up: stats.expensesUp,
      // Rising expenses move up but are not good news.
      good: !stats.expensesUp,
      icon: CreditCard,
      caption: 'Money out of your accounts',
    },
    {
      label: 'Outstanding invoices',
      value: stats.outstanding,
      icon: FileText,
      caption: `${stats.unpaidCount} unpaid · ${stats.overdueCount} overdue`,
    },
  ]
})

const showExport = ref(false)

// The dashboard's own figures are single values, not rows — the cash flow
// behind the chart is the part of this page that is actually a table.
const EXPORT_COLUMNS = [
  { key: 'monthStart', label: 'Month starting' },
  { key: 'label', label: 'Month' },
  { key: 'inflowAmount', label: 'Money in' },
  { key: 'outflowAmount', label: 'Money out' },
]
</script>

<template>
  <div>
    <PageHeader
      :title="`Welcome back, ${firstName}`"
      :subtitle="`${today} · cash view — see Reports for revenue invoiced and costs incurred`"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
        @click="showExport = true"
      >
        <Download class="size-4 text-slate-400" />
        Export report
      </button>
    </PageHeader>

    <ExportModal
      v-model:open="showExport"
      title="Export cash flow"
      subtitle="Money in and out per month, as shown on the chart below."
      filename="cash-flow"
      :columns="EXPORT_COLUMNS"
      :rows="data?.cashFlow ?? []"
    />

    <AsyncState
      class="mt-7 block"
      :loading="loading"
      :error="error"
      @retry="refresh"
    >
      <template #skeleton><DashboardSkeleton /></template>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard v-for="stat in statCards" :key="stat.label" v-bind="stat" />
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <CashFlowChart :months="data?.cashFlow ?? []" />
        <InvoiceSummary :buckets="data?.buckets ?? []" />
      </div>

      <div class="mt-6">
        <RecentTransactions :rows="data?.recent ?? []" />
      </div>
    </AsyncState>
  </div>
</template>
