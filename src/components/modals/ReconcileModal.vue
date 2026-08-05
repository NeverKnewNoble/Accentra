<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import {
  listExpenseCategories,
  listUnlinkedExpenses,
} from '../../services/expenseService'
import { bulkReconcile, listUnreconciled } from '../../services/transactionService'

/**
 * Works the review queue: tick what you have checked, optionally categorise it,
 * and clear the batch in one go.
 *
 * Reconciling is what closes a period, so the flag and the category are set
 * together — a cleared-but-uncategorised row is exactly what the reports would
 * later mis-file under "Uncategorised".
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['reconciled'])

const { ensureOrganization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const rows = ref([])
const categories = ref([])
const expenses = ref([])
const loading = ref(false)
const selected = ref(new Set())
const categoryByRow = reactive({})
const expenseByRow = reactive({})

const selectedCount = computed(() => selected.value.size)
const allSelected = computed(
  () => rows.value.length > 0 && selected.value.size === rows.value.length,
)

const categoryOptions = computed(() =>
  categories.value.map((row) => ({ value: row.id, label: row.name })),
)

/**
 * Claims this bank line could be. An exact amount match is flagged, because
 * that is nearly always the right one and picking it by eye off a long list is
 * how the wrong expense gets attached.
 */
function candidatesFor(row) {
  const magnitude = Math.abs(row.rawAmount)
  return expenses.value
    .map((expense) => ({
      ...expense,
      exact: Math.abs(expense.amount - magnitude) < 0.005,
    }))
    .sort((a, b) => Number(b.exact) - Number(a.exact))
}

/** Linking an expense adopts its category — the two should never disagree. */
function onExpenseMatched(row) {
  const matched = expenses.value.find((expense) => expense.id === expenseByRow[row.id])
  if (matched?.categoryId) categoryByRow[row.id] = matched.categoryId
}

watch(open, async (isOpen) => {
  if (!isOpen) return

  rows.value = []
  selected.value = new Set()
  Object.keys(categoryByRow).forEach((key) => delete categoryByRow[key])
  Object.keys(expenseByRow).forEach((key) => delete expenseByRow[key])
  reset()

  loading.value = true
  try {
    const orgId = await ensureOrganization()
    const [unreconciled, loadedCategories, loadedExpenses] = await Promise.all([
      listUnreconciled(orgId),
      listExpenseCategories(orgId),
      listUnlinkedExpenses(orgId),
    ])
    rows.value = unreconciled
    categories.value = loadedCategories
    expenses.value = loadedExpenses
    // Everything is ticked by default — the common action is "yes, all of
    // this is fine", and unticking the exceptions is less work.
    selected.value = new Set(unreconciled.map((row) => row.id))
    unreconciled.forEach((row) => {
      categoryByRow[row.id] = row.categoryId
      expenseByRow[row.id] = row.expenseId
    })
  } catch (caught) {
    error.value = caught
  } finally {
    loading.value = false
  }
})

function toggle(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(rows.value.map((row) => row.id))
}

async function onSubmit() {
  const ids = [...selected.value]
  if (!ids.length) return

  const count = await submit(() =>
    bulkReconcile(ids, {
      categoryByTransaction: categoryByRow,
      expenseByTransaction: expenseByRow,
    }),
  )

  if (count) {
    open.value = false
    emit('reconciled', count)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Reconcile transactions"
    subtitle="Confirm these against your statement, then clear them in one batch."
    size="xl"
    :busy="submitting"
  >
    <p
      v-if="!loading && rows.length"
      class="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600"
    >
      Matching a bank line to an expense ties the cash movement to the cost it
      paid for. Money in has nothing to match — an expense is a cost, not a
      receipt.
    </p>

    <p v-if="loading" class="text-sm text-slate-500">Loading the review queue…</p>

    <p
      v-else-if="!rows.length"
      class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
    >
      Nothing left to review — every transaction is reconciled.
    </p>

    <template v-else>
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full min-w-3xl text-left">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              <th scope="col" class="w-12 px-4 py-2.5">
                <input
                  type="checkbox"
                  class="size-4 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
                  :checked="allSelected"
                  aria-label="Select every transaction"
                  @change="toggleAll"
                />
              </th>
              <th scope="col" class="px-4 py-2.5 font-medium">Description</th>
              <th scope="col" class="px-4 py-2.5 font-medium">Account</th>
              <th scope="col" class="px-4 py-2.5 font-medium">Date</th>
              <th scope="col" class="w-52 px-4 py-2.5 font-medium">Matched expense</th>
              <th scope="col" class="w-44 px-4 py-2.5 font-medium">Category</th>
              <th scope="col" class="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-b border-slate-50 transition last:border-0"
              :class="selected.has(row.id) ? 'bg-brand-50/40' : ''"
            >
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  class="size-4 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
                  :checked="selected.has(row.id)"
                  :aria-label="`Reconcile ${row.description}`"
                  @change="toggle(row.id)"
                />
              </td>
              <td class="px-4 py-3">
                <span class="block text-sm font-medium text-ink">{{ row.description }}</span>
                <span class="block text-xs text-slate-400">{{ row.status }}</span>
              </td>
              <td class="px-4 py-3 text-sm whitespace-nowrap text-slate-500">{{ row.account }}</td>
              <td class="px-4 py-3 text-sm whitespace-nowrap text-slate-500">{{ row.date }}</td>

              <!-- Money in is never an expense, so there is nothing to match. -->
              <td class="px-4 py-3">
                <select
                  v-if="!row.positive"
                  v-model="expenseByRow[row.id]"
                  :aria-label="`Matching expense for ${row.description}`"
                  class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  @change="onExpenseMatched(row)"
                >
                  <option value="">Not matched</option>
                  <option
                    v-for="expense in candidatesFor(row)"
                    :key="expense.id"
                    :value="expense.id"
                  >
                    {{ expense.exact ? '✓ ' : '' }}{{ expense.vendor }} ·
                    {{ expense.amountLabel }} · {{ expense.date }}
                  </option>
                </select>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>

              <td class="px-4 py-3">
                <select
                  v-model="categoryByRow[row.id]"
                  :aria-label="`Category for ${row.description}`"
                  class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                >
                  <option value="">Uncategorised</option>
                  <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </td>
              <td
                class="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums"
                :class="row.positive ? 'text-emerald-600' : 'text-ink'"
              >
                {{ row.amount }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error.message }}</p>
    </template>

    <template #footer="{ close }">
      <p v-if="rows.length" class="mr-auto text-xs text-slate-500">
        {{ selectedCount }} of {{ rows.length }} selected
      </p>
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
        :disabled="submitting || !selectedCount"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="onSubmit"
      >
        {{ submitting ? 'Clearing…' : `Reconcile ${selectedCount || ''}`.trim() }}
      </button>
    </template>
  </BaseModal>
</template>
