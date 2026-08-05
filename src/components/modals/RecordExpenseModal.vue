<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Paperclip, Plus } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import NewCategoryModal from './NewCategoryModal.vue'
import FormField from '../ui/FormField.vue'
import SelectField from '../ui/SelectField.vue'
import TextareaField from '../ui/TextareaField.vue'
import { useAuth } from '../../composables/useAuth'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import { listAccounts } from '../../services/accountService'
import {
  PAYMENT_METHODS,
  createExpense,
  createExpenseWithPayment,
  listExpenseCategories,
  uploadReceipt,
} from '../../services/expenseService'
import { canWrite } from '../../services/organizationService'

/**
 * Files a claim against `expenses` (§3.9).
 *
 * `status` and `submitted_by` are not on the form: the insert policy (§5.8)
 * requires `submitted_by = auth.uid()`, and a claim always starts pending. A
 * field for either would only offer the user a way to be rejected.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { user } = useAuth()
const { ensureOrganization, organization, role } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  vendor: '',
  amount: '',
  spentOn: today(),
  categoryId: '',
  accountId: '',
  method: 'card',
  methodDetail: '',
  reimbursable: false,
  recordPayment: false,
  notes: '',
})

const categories = ref([])
const accounts = ref([])
const receipt = ref(null)
const showNewCategory = ref(false)
const fieldErrors = reactive({ vendor: '', amount: '', spentOn: '', accountId: '' })

const currency = computed(() => organization.value?.base_currency ?? 'GHS')

/**
 * Recording the bank side writes to `transactions`, which only bookkeepers and
 * up may do. Offering the option to someone RLS will reject would fail the
 * whole save for no reason they could act on.
 */
const canRecordPayment = computed(() => canWrite(role.value))

// A reimbursable claim was paid out of someone's own pocket — no company bank
// line exists for it until the repayment, which is its own transaction.
const paymentDisabled = computed(() => form.reimbursable)

const categoryOptions = computed(() =>
  categories.value.map((row) => ({ value: row.id, label: row.name })),
)

const accountOptions = computed(() =>
  accounts.value.map((row) => ({
    value: row.id,
    label: row.institution ? `${row.name} — ${row.institution}` : row.name,
  })),
)

async function loadReferenceData() {
  const orgId = await ensureOrganization()
  const [loadedCategories, loadedAccounts] = await Promise.all([
    listExpenseCategories(orgId),
    listAccounts(orgId),
  ])
  categories.value = loadedCategories
  accounts.value = loadedAccounts
}

watch(open, (isOpen) => {
  if (!isOpen) return

  Object.assign(form, {
    vendor: '',
    amount: '',
    spentOn: today(),
    categoryId: '',
    accountId: '',
    method: 'card',
    methodDetail: '',
    reimbursable: false,
    recordPayment: false,
    notes: '',
  })
  Object.assign(fieldErrors, { vendor: '', amount: '', spentOn: '', accountId: '' })
  receipt.value = null
  reset()

  // Errors here surface through the same banner as a failed save.
  loadReferenceData().catch((caught) => {
    error.value = caught
  })
})

function onCategoryCreated(category) {
  categories.value = [...categories.value, category].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  form.categoryId = category.id
}

function onFileChange(event) {
  receipt.value = event.target.files?.[0] ?? null
}

const willRecordPayment = computed(
  () => form.recordPayment && canRecordPayment.value && !paymentDisabled.value,
)

function validate() {
  fieldErrors.vendor = form.vendor.trim() ? '' : 'Who was paid?'
  fieldErrors.amount =
    Number(form.amount) > 0 ? '' : 'Enter an amount greater than zero.'
  fieldErrors.spentOn = form.spentOn ? '' : 'Pick the date it was spent.'
  // `transactions.account_id` is not nullable, so the bank side needs one.
  fieldErrors.accountId =
    willRecordPayment.value && !form.accountId
      ? 'Choose the account the money left.'
      : ''

  return !Object.values(fieldErrors).some(Boolean)
}

async function onSubmit() {
  if (!validate()) return

  const created = await submit(async () => {
    const orgId = await ensureOrganization()
    const payload = {
      vendor: form.vendor.trim(),
      amount: Number(form.amount),
      spentOn: form.spentOn,
      categoryId: form.categoryId || null,
      accountId: form.accountId || null,
      method: form.method,
      methodDetail: form.methodDetail.trim() || null,
      reimbursable: form.reimbursable,
      currency: currency.value,
      notes: form.notes.trim() || null,
    }

    const expense = willRecordPayment.value
      ? await createExpenseWithPayment(orgId, user.value.id, payload)
      : await createExpense(orgId, user.value.id, payload)

    // The receipt needs the expense id in its storage path, so it can only go
    // up once the row exists.
    if (receipt.value) await uploadReceipt(orgId, expense.id, receipt.value)

    return expense
  })

  if (created) {
    open.value = false
    emit('created', created)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Record expense"
    subtitle="Files a claim for approval. It stays pending until someone signs it off."
    size="lg"
    :busy="submitting"
  >
    <form id="record-expense-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="onSubmit">
      <FormField
        v-model="form.vendor"
        label="Vendor"
        placeholder="Amazon Web Services"
        required
        :error="fieldErrors.vendor"
      />
      <FormField
        v-model="form.amount"
        label="Amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        required
        :error="fieldErrors.amount"
        :hint="fieldErrors.amount ? '' : `In ${currency}`"
      />

      <FormField
        v-model="form.spentOn"
        label="Date spent"
        type="date"
        required
        :error="fieldErrors.spentOn"
      />
      <SelectField
        v-model="form.categoryId"
        label="Category"
        placeholder="Uncategorised"
        :options="categoryOptions"
      >
        <template #action>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
            @click="showNewCategory = true"
          >
            <Plus class="size-3.5" />
            New category
          </button>
        </template>
      </SelectField>

      <SelectField
        v-model="form.method"
        label="Paid with"
        :options="PAYMENT_METHODS"
        required
      />
      <FormField
        v-model="form.methodDetail"
        label="Payment detail"
        placeholder="Visa ·· 4412"
        hint="Shown beneath the method on the expense table."
      />

      <SelectField
        v-model="form.accountId"
        label="Account"
        :placeholder="willRecordPayment ? 'Choose an account' : 'Not linked to an account'"
        :options="accountOptions"
        :required="willRecordPayment"
        :error="fieldErrors.accountId"
        :hint="fieldErrors.accountId ? '' : 'Which account the money left.'"
      />

      <div>
        <span class="mb-1.5 block text-sm font-medium text-ink">Receipt</span>
        <label
          class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40"
        >
          <Paperclip class="size-4 shrink-0 text-slate-400" />
          <span class="truncate">{{ receipt?.name ?? 'Attach a file' }}</span>
          <input
            type="file"
            class="sr-only"
            accept="image/*,application/pdf"
            @change="onFileChange"
          />
        </label>
        <p class="mt-1.5 text-xs text-slate-500">Optional — you can add it later.</p>
      </div>

      <div class="sm:col-span-2">
        <TextareaField
          v-model="form.notes"
          label="Notes"
          placeholder="Anything the approver should know"
        />
      </div>

      <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
        <label class="flex items-start gap-3">
          <input
            v-model="form.reimbursable"
            type="checkbox"
            class="mt-0.5 size-4.5 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
          />
          <span class="text-sm">
            <span class="block font-medium text-ink">Reimbursable</span>
            <span class="block text-slate-500">
              Paid personally and owed back once approved.
            </span>
          </span>
        </label>

        <!--
          The cost and the cash are separate records for good reason — a card
          settles days later, a reimbursable claim has no company bank line at
          all. When they *are* the same event, this ties them together so the
          account balance and the profit and loss agree.
        -->
        <label
          v-if="canRecordPayment"
          class="flex items-start gap-3"
          :class="paymentDisabled ? 'opacity-50' : ''"
        >
          <input
            v-model="form.recordPayment"
            type="checkbox"
            :disabled="paymentDisabled"
            class="mt-0.5 size-4.5 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed"
          />
          <span class="text-sm">
            <span class="block font-medium text-ink">This has already left the account</span>
            <span class="block text-slate-500">
              {{
                paymentDisabled
                  ? 'Not for reimbursable claims — the bank line is the repayment, recorded when you pay it back.'
                  : 'Also records the matching money-out transaction, linked to this claim.'
              }}
            </span>
          </span>
        </label>
      </div>

      <p v-if="error" class="text-sm text-red-600 sm:col-span-2" role="alert">
        {{ error.message }}
      </p>
    </form>

    <NewCategoryModal v-model:open="showNewCategory" @created="onCategoryCreated" />

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
        form="record-expense-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Recording…' : 'Record expense' }}
      </button>
    </template>
  </BaseModal>
</template>
