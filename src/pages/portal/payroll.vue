<script setup>
import { computed, ref } from 'vue'
import {
  Banknote,
  CalendarClock,
  Check,
  Play,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import StatCard from '../../components/dashboard/StatCard.vue'
import AsyncState from '../../components/portal/AsyncState.vue'
import PageHeader from '../../components/portal/PageHeader.vue'
import StatusPill from '../../components/portal/StatusPill.vue'
import { useAuth } from '../../composables/useAuth'
import { usePortalData } from '../../composables/usePortalData'
import { approvePayrollRun, getPayrollPageData } from '../../services/payrollService'
import { initials } from '../../utils/format'

const { user } = useAuth()

const { data, loading, error, refresh } = usePortalData((orgId) => getPayrollPageData(orgId))

const approving = ref(false)
const approvalError = ref(null)

const statCards = computed(() => {
  const stats = data.value?.stats
  if (!stats) return []
  return [
    {
      label: 'Next payroll',
      value: stats.nextPayDate,
      delta: stats.daysAway,
      up: false,
      icon: CalendarClock,
      caption: 'Approvals close the day before',
    },
    {
      label: 'Monthly gross',
      value: stats.monthlyGross,
      icon: Banknote,
      caption: 'Including employer contributions',
    },
    {
      label: 'Team members',
      value: stats.headcount,
      icon: Users,
      caption: `${stats.salariedCount} salaried · ${stats.contractCount} contract`,
    },
    {
      label: 'Taxes due',
      value: stats.taxesDue,
      icon: ShieldCheck,
      caption: 'PAYE and SSNIT contributions',
    },
  ]
})

async function onApprove() {
  const runId = data.value?.run?.id
  if (!runId) return

  approving.value = true
  approvalError.value = null
  try {
    await approvePayrollRun(runId, user.value.id)
    await refresh()
  } catch (caught) {
    approvalError.value = caught
  } finally {
    approving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Payroll" subtitle="Run pay, file taxes and keep every journal posted.">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
      >
        <Plus class="size-4 text-slate-400" />
        Add employee
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <Play class="size-4" />
        Run payroll
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

      <!-- Upcoming run -->
      <section
        v-if="data?.run"
        class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="grid gap-px bg-slate-200 lg:grid-cols-[1.2fr_1fr]">
          <div class="bg-white p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-ink">{{ data.run.period }} pay run</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Pays {{ data.run.employees }} people on {{ data.run.payDate }}
                </p>
              </div>
              <StatusPill :status="data.run.status" />
            </div>

            <dl class="mt-6 grid gap-5 sm:grid-cols-3">
              <div>
                <dt class="text-xs text-slate-500">Gross</dt>
                <dd class="mt-1 text-lg font-semibold text-ink tabular-nums">{{ data.run.gross }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Deductions</dt>
                <dd class="mt-1 text-lg font-semibold text-ink tabular-nums">{{ data.run.deductions }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Net pay</dt>
                <dd class="mt-1 text-lg font-semibold text-brand-600 tabular-nums">{{ data.run.net }}</dd>
              </div>
            </dl>
          </div>

          <!-- Progress checklist -->
          <div class="bg-white p-6">
            <h3 class="text-sm font-semibold text-ink">Run checklist</h3>
            <ol class="mt-4 space-y-3.5">
              <li
                v-for="step in data.run.steps"
                :key="step.label"
                class="flex items-center gap-3 text-sm"
              >
                <span
                  class="grid size-6 shrink-0 place-items-center rounded-full transition"
                  :class="step.done ? 'bg-emerald-500 text-white' : 'border-2 border-dashed border-slate-300 bg-white'"
                >
                  <Check v-if="step.done" class="size-3.5" :stroke-width="3" />
                </span>
                <span :class="step.done ? 'text-slate-500 line-through' : 'font-medium text-ink'">
                  {{ step.label }}
                </span>
              </li>
            </ol>

            <p v-if="approvalError" class="mt-4 text-sm text-red-600" role="alert">
              {{ approvalError.message }}
            </p>

            <button
              type="button"
              :disabled="approving"
              class="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              @click="onApprove"
            >
              {{ approving ? 'Submitting…' : 'Approve and submit' }}
            </button>
          </div>
        </div>
      </section>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <!-- Employees -->
        <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 class="text-base font-semibold text-ink">Team</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ data?.employees?.length ?? 0 }} people on payroll
              </p>
            </div>
            <button
              type="button"
              class="text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
            >
              Manage
            </button>
          </header>

          <div class="overflow-x-auto">
            <table class="w-full min-w-2xl text-left">
              <thead>
                <tr class="border-b border-slate-100 text-xs text-slate-400">
                  <th scope="col" class="px-6 py-3 font-medium">Employee</th>
                  <th scope="col" class="px-6 py-3 font-medium">Type</th>
                  <th scope="col" class="px-6 py-3 font-medium">Started</th>
                  <th scope="col" class="px-6 py-3 font-medium">Status</th>
                  <th scope="col" class="px-6 py-3 text-right font-medium">Pay</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="person in data?.employees ?? []"
                  :key="person.id"
                  class="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                      >
                        {{ initials(person.name) }}
                      </span>
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-ink">{{ person.name }}</span>
                        <span class="block truncate text-xs text-slate-400">{{ person.role }}</span>
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{{ person.type }}</td>
                  <td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{{ person.start }}</td>
                  <td class="px-6 py-4"><StatusPill :status="person.status" /></td>
                  <td class="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
                    {{ person.pay }}
                  </td>
                </tr>

                <tr v-if="!data?.employees?.length">
                  <td colspan="5" class="px-6 py-14 text-center">
                    <p class="text-sm font-medium text-ink">Nobody on payroll yet</p>
                    <p class="mt-1 text-sm text-slate-500">Add your first employee to run pay.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- History -->
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h2 class="text-base font-semibold text-ink">Previous runs</h2>
            <p class="mt-1 text-sm text-slate-500">Every run posts its own journal</p>
          </header>

          <ul v-if="data?.history?.length" class="mt-5 space-y-3">
            <li
              v-for="run in data.history"
              :key="run.id"
              class="rounded-xl border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-slate-50/70"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-ink">{{ run.period }}</p>
                  <p class="mt-0.5 text-xs text-slate-400">
                    Paid {{ run.paid }} · {{ run.employees }} people
                  </p>
                </div>
                <StatusPill :status="run.status" />
              </div>
              <div class="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span class="text-xs text-slate-500">Net paid</span>
                <span class="text-sm font-semibold text-ink tabular-nums">{{ run.net }}</span>
              </div>
            </li>
          </ul>

          <p v-else class="mt-5 text-sm text-slate-400">No completed pay runs yet.</p>
        </section>
      </div>
    </AsyncState>
  </div>
</template>
