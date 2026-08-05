<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDownRight, ArrowUpRight, CircleCheck, Download, RefreshCw } from 'lucide-vue-next'
import AsyncState from '../../components/portal/AsyncState.vue'
import FilterTabs from '../../components/portal/FilterTabs.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
import SearchInput from '../../components/portal/SearchInput.vue'
import StatusPill from '../../components/portal/StatusPill.vue'
import AccountCardsSkeleton from '../../components/skeletons/AccountCardsSkeleton.vue'
import TableSkeleton from '../../components/skeletons/TableSkeleton.vue'
import { useOrganization } from '../../composables/useOrganization'
import { usePortalData } from '../../composables/usePortalData'
import {
  countUnreconciled,
  listAccountBalances,
  listTransactions,
  subscribeToTransactions,
} from '../../services/transactionService'
import { transactionFilters } from '../../utils/samplesData'

const { ensureOrganization } = useOrganization()

const activeAccountId = ref(null)
const activeFilter = ref('All')
const query = ref('')

const {
  data: accounts,
  loading: accountsLoading,
  error: accountsError,
  refresh: refreshAccounts,
} = usePortalData((orgId) => listAccountBalances(orgId), { initial: [] })

const {
  data: unreconciled,
  refresh: refreshUnreconciled,
} = usePortalData((orgId) => countUnreconciled(orgId), { initial: 0 })

const {
  data: rows,
  loading: rowsLoading,
  error: rowsError,
  refresh: refreshRows,
} = usePortalData(
  (orgId) =>
    listTransactions(orgId, {
      accountId: activeAccountId.value,
      filter: activeFilter.value,
      search: query.value,
    }),
  { initial: [], watchSources: [activeAccountId, activeFilter, query] },
)

const activeAccountName = computed(
  () => accounts.value?.find((a) => a.id === activeAccountId.value)?.name ?? 'All accounts',
)

// Live feed. Refetch rather than splicing the payload in, so the row arrives
// with its joined account and category names already resolved.
let unsubscribe = null

onMounted(async () => {
  try {
    const orgId = await ensureOrganization()
    unsubscribe = subscribeToTransactions(orgId, () => {
      refreshRows()
      refreshUnreconciled()
      refreshAccounts()
    })
  } catch {
    // The page already surfaces the organisation error through AsyncState.
  }
})

onBeforeUnmount(() => unsubscribe?.())

function refreshAll() {
  refreshAccounts()
  refreshRows()
  refreshUnreconciled()
}
</script>

<template>
  <div>
    <PageHeader title="Transactions" subtitle="Every movement across your connected accounts.">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
      >
        <Download class="size-4 text-slate-400" />
        Export CSV
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98]"
        @click="refreshAll"
      >
        <RefreshCw class="size-4" />
        Sync accounts
      </button>
    </PageHeader>

    <!-- Account switcher doubles as a balance summary -->
    <AsyncState
      class="mt-7 block"
      :loading="accountsLoading"
      :error="accountsError"
      @retry="refreshAccounts"
    >
      <template #skeleton><AccountCardsSkeleton /></template>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="account in accounts"
          :key="account.id ?? 'all'"
          type="button"
          class="rounded-2xl border bg-white p-5 text-left shadow-sm transition"
          :class="
            activeAccountId === account.id
              ? 'border-brand-500 ring-4 ring-brand-100'
              : 'border-slate-200 hover:border-brand-200 hover:shadow-card'
          "
          :aria-pressed="activeAccountId === account.id"
          @click="activeAccountId = account.id"
        >
          <p class="text-sm font-medium text-slate-500">{{ account.name }}</p>
          <p class="mt-2 text-xl font-semibold tracking-tight text-ink tabular-nums">
            {{ account.balance }}
          </p>
          <p class="mt-1 text-xs text-slate-400">
            {{ account.institution || 'Combined across all feeds' }}
          </p>
        </button>
      </div>
    </AsyncState>

    <!-- Reconciliation banner -->
    <div
      v-if="unreconciled"
      class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4"
    >
      <CircleCheck class="size-5 shrink-0 text-brand-600" />
      <p class="text-sm text-brand-900">
        <span class="font-semibold">{{ unreconciled }} transactions</span>
        need review before this period can be closed.
      </p>
      <button
        type="button"
        class="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
      >
        Start reconciling
      </button>
    </div>

    <section class="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <FilterTabs v-model="activeFilter" :options="transactionFilters" />
        <SearchInput v-model="query" placeholder="Search description…" />
      </header>

      <AsyncState :loading="rowsLoading" :error="rowsError" @retry="refreshRows">
        <template #skeleton>
          <TableSkeleton :rows="8" :columns="5" />
        </template>

        <div class="overflow-x-auto">
          <table class="w-full min-w-3xl text-left">
            <thead>
              <tr class="border-b border-slate-100 text-xs text-slate-400">
                <th scope="col" class="px-6 py-3 font-medium">Description</th>
                <th scope="col" class="px-6 py-3 font-medium">Account</th>
                <th scope="col" class="px-6 py-3 font-medium">Date</th>
                <th scope="col" class="px-6 py-3 font-medium">Status</th>
                <th scope="col" class="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-lg"
                      :class="row.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                    >
                      <component :is="row.positive ? ArrowUpRight : ArrowDownRight" class="size-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-medium text-ink">{{ row.description }}</span>
                      <span class="block text-xs text-slate-400">{{ row.category }}</span>
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{{ row.account }}</td>
                <td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{{ row.date }}</td>
                <td class="px-6 py-4"><StatusPill :status="row.status" /></td>
                <td
                  class="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap tabular-nums"
                  :class="row.positive ? 'text-emerald-600' : 'text-ink'"
                >
                  {{ row.amount }}
                </td>
              </tr>

              <tr v-if="!rows?.length">
                <td colspan="5" class="px-6 py-14 text-center">
                  <p class="text-sm font-medium text-ink">No transactions to show</p>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ activeAccountName }} has nothing matching these filters.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AsyncState>
    </section>
  </div>
</template>
