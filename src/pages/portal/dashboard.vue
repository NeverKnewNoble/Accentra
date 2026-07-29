<script setup>
import { computed } from 'vue'
import { CreditCard, Download, FileText, Landmark, Wallet } from 'lucide-vue-next'
import CashFlowChart from '../../components/dashboard/CashFlowChart.vue'
import InvoiceSummary from '../../components/dashboard/InvoiceSummary.vue'
import RecentTransactions from '../../components/dashboard/RecentTransactions.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import AsyncState from '../../components/portal/AsyncState.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
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

// Icons live here rather than in the service — they are presentation, and the
// service layer should stay free of Vue components.
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
      label: 'Revenue this month',
      value: stats.revenue,
      delta: stats.revenueDelta,
      up: stats.revenueUp,
      good: stats.revenueUp,
      icon: Landmark,
      caption: `vs ${stats.revenueLastMonth} last month`,
    },
    {
      label: 'Expenses this month',
      value: stats.expenses,
      delta: stats.expensesDelta,
      up: stats.expensesUp,
      // Rising expenses move up but are not good news.
      good: !stats.expensesUp,
      icon: CreditCard,
      caption: 'Compared with last month',
    },
    {
      label: 'Outstanding invoices',
      value: stats.outstanding,
      icon: FileText,
      caption: `${stats.unpaidCount} unpaid · ${stats.overdueCount} overdue`,
    },
  ]
})
</script>

<template>
  <div>
    <PageHeader
      :title="`Welcome back, ${firstName}`"
      :subtitle="today"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
      >
        <Download class="size-4 text-slate-400" />
        Export report
      </button>
    </PageHeader>

    <AsyncState
      class="mt-7 block"
      :loading="loading"
      :error="error"
      skeleton="cards"
      @retry="refresh"
    >
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
