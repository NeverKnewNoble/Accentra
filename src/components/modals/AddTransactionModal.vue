<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import AddAccountModal from './AddAccountModal.vue'
import FormField from '../ui/FormField.vue'
import SelectField from '../ui/SelectField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import { listAccounts } from '../../services/accountService'
import { listExpenseCategories } from '../../services/expenseService'
import {
  TRANSACTION_STATUSES,
  createTransaction,
} from '../../services/transactionService'

/**
 * Adds a row to `transactions` (§3.10).
 *
 * The table stores a signed amount — positive in, negative out — so the form
 * asks for a direction and a magnitude and applies the sign on save. Asking
 * for a negative number instead is the kind of thing people get wrong once and
 * never notice.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { ensureOrganization, organization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  accountId: '',
  direction: 'out',
  amount: '',
  occurredOn: today(),
  description: '',
  categoryId: '',
  status: 'cleared',
  currency: 'GHS',
  fxRate: 1,
  externalRef: '',
})

const accounts = ref([])
const categories = ref([])
const showNewAccount = ref(false)
const showAdvanced = ref(false)
const fieldErrors = reactive({ accountId: '', amount: '', description: '' })

const baseCurrency = computed(() => organization.value?.base_currency ?? 'GHS')
const isForeign = computed(() => form.currency.toUpperCase() !== baseCurrency.value)

const accountOptions = computed(() =>
  accounts.value.map((row) => ({
    value: row.id,
    label: row.institution ? `${row.name} — ${row.institution}` : row.name,
  })),
)

const categoryOptions = computed(() =>
  categories.value.map((row) => ({ value: row.id, label: row.name })),
)

async function loadReferenceData() {
  const orgId = await ensureOrganization()
  const [loadedAccounts, loadedCategories] = await Promise.all([
    listAccounts(orgId),
    listExpenseCategories(orgId),
  ])
  accounts.value = loadedAccounts
  categories.value = loadedCategories

  // One account is the common case — preselect it rather than making the user
  // choose from a list of one.
  if (loadedAccounts.length === 1) form.accountId = loadedAccounts[0].id
}

watch(open, (isOpen) => {
  if (!isOpen) return

  Object.assign(form, {
    accountId: '',
    direction: 'out',
    amount: '',
    occurredOn: today(),
    description: '',
    categoryId: '',
    status: 'cleared',
    currency: baseCurrency.value,
    fxRate: 1,
    externalRef: '',
  })
  Object.assign(fieldErrors, { accountId: '', amount: '', description: '' })
  showAdvanced.value = false
  reset()

  loadReferenceData().catch((caught) => {
    error.value = caught
  })
})

function onAccountCreated(account) {
  accounts.value = [...accounts.value, account].sort((a, b) => a.name.localeCompare(b.name))
  form.accountId = account.id
}

function validate() {
  fieldErrors.accountId = form.accountId ? '' : 'Which account did this move through?'
  // The `transactions_amount_nonzero` constraint rejects a zero outright.
  fieldErrors.amount = Number(form.amount) > 0 ? '' : 'Enter an amount greater than zero.'
  fieldErrors.description = form.description.trim() ? '' : 'Describe the transaction.'

  return !fieldErrors.accountId && !fieldErrors.amount && !fieldErrors.description
}

async function onSubmit() {
  if (!validate()) return

  const magnitude = Math.abs(Number(form.amount))

  const created = await submit(async () =>
    createTransaction(await ensureOrganization(), {
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      occurredOn: form.occurredOn,
      description: form.description.trim(),
      amount: form.direction === 'in' ? magnitude : -magnitude,
      currency: (form.currency || 'GHS').toUpperCase().slice(0, 3),
      fxRate: Number(form.fxRate) || 1,
      status: form.status,
      externalRef: form.externalRef.trim(),
    }),
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
    title="New transaction"
    subtitle="Record a movement that your bank feed did not bring in."
    size="lg"
    :busy="submitting"
  >
    <form id="add-transaction-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="onSubmit">
      <!-- Direction sets the sign of `amount`. -->
      <div class="sm:col-span-2">
        <span class="mb-1.5 block text-sm font-medium text-ink">Direction</span>
        <div class="grid grid-cols-2 gap-3">
          <label
            v-for="option in [
              { value: 'in', label: 'Money in', icon: ArrowUpRight },
              { value: 'out', label: 'Money out', icon: ArrowDownRight },
            ]"
            :key="option.value"
            class="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition"
            :class="
              form.direction === option.value
                ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-100'
                : 'border-slate-200 bg-white hover:border-slate-300'
            "
          >
            <input v-model="form.direction" type="radio" :value="option.value" class="sr-only" />
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg"
              :class="
                option.value === 'in'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              "
            >
              <component :is="option.icon" class="size-4" />
            </span>
            <span class="text-sm font-medium text-ink">{{ option.label }}</span>
          </label>
        </div>
      </div>

      <SelectField
        v-model="form.accountId"
        label="Account"
        placeholder="Choose an account"
        :options="accountOptions"
        required
        :error="fieldErrors.accountId"
      >
        <template #action>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
            @click="showNewAccount = true"
          >
            <Plus class="size-3.5" />
            New account
          </button>
        </template>
      </SelectField>

      <FormField
        v-model="form.amount"
        label="Amount"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        required
        :error="fieldErrors.amount"
        :hint="fieldErrors.amount ? '' : 'Always positive — the direction above sets the sign.'"
      />

      <div class="sm:col-span-2">
        <FormField
          v-model="form.description"
          label="Description"
          placeholder="Paystack payout"
          required
          :error="fieldErrors.description"
        />
      </div>

      <FormField v-model="form.occurredOn" label="Date" type="date" required />
      <SelectField
        v-model="form.categoryId"
        label="Category"
        placeholder="Uncategorised"
        :options="categoryOptions"
      />

      <SelectField
        v-model="form.status"
        label="Status"
        :options="TRANSACTION_STATUSES"
        hint="Anything but cleared keeps it in the review queue."
      />

      <div class="flex items-end">
        <button
          type="button"
          class="pb-3 text-sm font-medium text-brand-600 underline-offset-4 transition hover:underline"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? 'Hide' : 'Show' }} currency and reference
        </button>
      </div>

      <template v-if="showAdvanced">
        <FormField
          v-model="form.currency"
          label="Currency"
          placeholder="GHS"
          hint="Three-letter ISO code."
        />
        <FormField
          v-model="form.fxRate"
          label="FX rate"
          type="number"
          min="0"
          step="0.000001"
          :disabled="!isForeign"
          :hint="
            isForeign
              ? `Multiplier into ${baseCurrency}.`
              : `Only applies to a currency other than ${baseCurrency}.`
          "
        />
        <div class="sm:col-span-2">
          <FormField
            v-model="form.externalRef"
            label="External reference"
            placeholder="Bank feed id"
            hint="Unique per organisation — blocks the same row being imported twice."
          />
        </div>
      </template>

      <p v-if="error" class="text-sm text-red-600 sm:col-span-2" role="alert">
        {{ error.message }}
      </p>
    </form>

    <AddAccountModal v-model:open="showNewAccount" @created="onAccountCreated" />

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
        type="submit"
        form="add-transaction-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Saving…' : 'Add transaction' }}
      </button>
    </template>
  </BaseModal>
</template>
