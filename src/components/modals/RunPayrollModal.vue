<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Info } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import {
  createPayrollRunWithItems,
  listEmployeesRaw,
} from '../../services/payrollService'
import { formatCurrency } from '../../utils/format'
import { grossToNet, monthBounds, previewNet } from '../../utils/payroll'

/**
 * Creates a `payroll_runs` row (§3.12) and one `payroll_items` row per person
 * (§3.13).
 *
 * Nothing is totalled here: `payroll_items_recalc` (§6.3) sums gross,
 * deductions and headcount onto the run, and `net` is a generated column. The
 * figures in the footer are a preview of what the database will produce.
 *
 * PAYE and SSNIT are prefilled from the Ghana bands and stay editable —
 * allowances and reliefs are real and this cannot know about them.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { ensureOrganization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const form = reactive({ periodStart: '', periodEnd: '', payDate: '' })
const lines = ref([])
const loading = ref(false)
const fieldErrors = reactive({ period: '', lines: '' })

const included = computed(() => lines.value.filter((line) => line.include))

const totals = computed(() =>
  included.value.reduce(
    (sum, line) => {
      const gross = Number(line.gross) || 0
      const deductions =
        (Number(line.payeTax) || 0) +
        (Number(line.ssnitEmployee) || 0) +
        (Number(line.otherDeductions) || 0)

      return {
        gross: sum.gross + gross,
        deductions: sum.deductions + deductions,
        net: sum.net + (gross - deductions),
      }
    },
    { gross: 0, deductions: 0, net: 0 },
  ),
)

function toLine(employee) {
  const isContract = employee.employment_type === 'contract'
  // A contractor's `pay_rate` is hourly, so it is not the month's gross —
  // there is no honest default, and 0 makes that obvious.
  const gross = isContract ? 0 : Number(employee.pay_rate) || 0

  return {
    employeeId: employee.id,
    name: employee.full_name,
    role: employee.role_title ?? '—',
    isContract,
    payRate: Number(employee.pay_rate) || 0,
    include: true,
    ...grossToNet(gross),
  }
}

/**
 * Recompute the deductions from a changed gross.
 *
 * Manual edits to a deduction survive until the gross next changes, at which
 * point the whole line is derived again — that is the only rule that stays
 * predictable when both are editable.
 */
function recalculate(line) {
  Object.assign(line, grossToNet(line.gross, { otherDeductions: line.otherDeductions }))
}

watch(open, async (isOpen) => {
  if (!isOpen) return

  const { start, end } = monthBounds()
  Object.assign(form, { periodStart: start, periodEnd: end, payDate: end })
  Object.assign(fieldErrors, { period: '', lines: '' })
  lines.value = []
  reset()

  loading.value = true
  try {
    const employees = await listEmployeesRaw(await ensureOrganization())
    lines.value = employees.map(toLine)
  } catch (caught) {
    error.value = caught
  } finally {
    loading.value = false
  }
})

function validate() {
  if (!form.periodStart || !form.periodEnd || !form.payDate) {
    fieldErrors.period = 'Set the period and the pay date.'
  } else if (form.periodEnd < form.periodStart) {
    // Mirrors the `payroll_period_valid` check constraint.
    fieldErrors.period = 'The period cannot end before it starts.'
  } else {
    fieldErrors.period = ''
  }

  fieldErrors.lines = included.value.length ? '' : 'Include at least one person.'

  return !fieldErrors.period && !fieldErrors.lines
}

async function onSubmit() {
  if (!validate()) return

  const created = await submit(async () =>
    createPayrollRunWithItems(
      await ensureOrganization(),
      {
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
      },
      included.value.map((line) => ({
        employeeId: line.employeeId,
        gross: Number(line.gross) || 0,
        payeTax: Number(line.payeTax) || 0,
        ssnitEmployee: Number(line.ssnitEmployee) || 0,
        ssnitEmployer: Number(line.ssnitEmployer) || 0,
        otherDeductions: Number(line.otherDeductions) || 0,
      })),
    ),
  )

  if (created) {
    open.value = false
    emit('created', created)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Run payroll"
    subtitle="Creates a draft run. Nothing leaves your bank until it is approved."
    size="xl"
    :busy="submitting"
  >
    <div class="grid gap-5 sm:grid-cols-3">
      <FormField v-model="form.periodStart" label="Period start" type="date" required />
      <FormField v-model="form.periodEnd" label="Period end" type="date" required />
      <FormField v-model="form.payDate" label="Pay date" type="date" required />
    </div>

    <p v-if="fieldErrors.period" class="mt-2 text-sm text-red-600" role="alert">
      {{ fieldErrors.period }}
    </p>

    <p
      class="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600"
    >
      <Info class="mt-px size-4 shrink-0 text-slate-400" />
      <span>
        PAYE is prefilled from the Ghana monthly bands and SSNIT at 5.5% employee
        and 13% employer. Every figure is editable — check them against current
        GRA guidance before you approve the run. Changing a gross recalculates
        that row.
      </span>
    </p>

    <p v-if="loading" class="mt-5 text-sm text-slate-500">Loading the team…</p>

    <p
      v-else-if="!lines.length"
      class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
    >
      Nobody is on payroll yet. Add an employee first.
    </p>

    <template v-else>
      <div class="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full min-w-4xl text-left">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              <th scope="col" class="w-12 px-3 py-2.5"><span class="sr-only">Include</span></th>
              <th scope="col" class="px-3 py-2.5 font-medium">Employee</th>
              <th scope="col" class="w-32 px-3 py-2.5 font-medium">Gross</th>
              <th scope="col" class="w-28 px-3 py-2.5 font-medium">PAYE</th>
              <th scope="col" class="w-28 px-3 py-2.5 font-medium">SSNIT 5.5%</th>
              <th scope="col" class="w-28 px-3 py-2.5 font-medium">Employer 13%</th>
              <th scope="col" class="w-28 px-3 py-2.5 font-medium">Other</th>
              <th scope="col" class="w-28 px-3 py-2.5 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in lines"
              :key="line.employeeId"
              class="border-b border-slate-50 last:border-0"
              :class="line.include ? '' : 'opacity-45'"
            >
              <td class="px-3 py-2">
                <input
                  v-model="line.include"
                  type="checkbox"
                  class="size-4 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
                  :aria-label="`Include ${line.name}`"
                />
              </td>
              <td class="px-3 py-2">
                <span class="block text-sm font-medium text-ink">{{ line.name }}</span>
                <span class="block text-xs text-slate-400">
                  {{ line.role }}
                  <template v-if="line.isContract">
                    · {{ formatCurrency(line.payRate, { decimals: true }) }}/hr
                  </template>
                </span>
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="line.gross"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="!line.include"
                  :aria-label="`Gross pay for ${line.name}`"
                  class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
                  @change="recalculate(line)"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="line.payeTax"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="!line.include"
                  :aria-label="`PAYE for ${line.name}`"
                  class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="line.ssnitEmployee"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="!line.include"
                  :aria-label="`SSNIT employee contribution for ${line.name}`"
                  class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="line.ssnitEmployer"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="!line.include"
                  :aria-label="`SSNIT employer contribution for ${line.name}`"
                  class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="line.otherDeductions"
                  type="number"
                  min="0"
                  step="0.01"
                  :disabled="!line.include"
                  :aria-label="`Other deductions for ${line.name}`"
                  class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50"
                />
              </td>
              <td class="px-3 py-2 text-right text-sm font-semibold text-ink tabular-nums">
                {{ formatCurrency(previewNet(line), { decimals: true }) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-slate-200 bg-slate-50/70 text-sm">
              <td colspan="2" class="px-3 py-3 font-semibold text-ink">
                {{ included.length }} of {{ lines.length }} included
              </td>
              <td class="px-3 py-3 font-semibold text-ink tabular-nums">
                {{ formatCurrency(totals.gross, { decimals: true }) }}
              </td>
              <td colspan="4" class="px-3 py-3 text-slate-500">
                Deductions {{ formatCurrency(totals.deductions, { decimals: true }) }}
              </td>
              <td class="px-3 py-3 text-right font-semibold text-brand-600 tabular-nums">
                {{ formatCurrency(totals.net, { decimals: true }) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p v-if="fieldErrors.lines" class="mt-2 text-sm text-red-600" role="alert">
        {{ fieldErrors.lines }}
      </p>
    </template>

    <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error.message }}</p>

    <template #footer="{ close }">
      <button
        type="button"
        :disabled="submitting"
        class="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        @click="close"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="submitting || loading || !lines.length"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="onSubmit"
      >
        {{ submitting ? 'Creating…' : 'Create draft run' }}
      </button>
    </template>
  </BaseModal>
</template>
