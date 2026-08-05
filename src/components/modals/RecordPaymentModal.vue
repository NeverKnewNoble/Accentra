<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { getInvoice, recordInvoicePayment } from '../../services/invoiceService'
import { formatCurrency, formatDate } from '../../utils/format'

/**
 * Settles an invoice by writing `amount_paid` (§3.6).
 *
 * `balance_due` is a generated column, so it is never sent — Postgres derives
 * it from `total - amount_paid` the moment this saves.
 */
const props = defineProps({
  invoiceId: { type: String, default: '' },
})

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['recorded'])

const { submitting, error, submit, reset } = useFormSubmit()

const invoice = ref(null)
const loading = ref(false)
const amount = ref('')
const amountError = ref('')

const total = computed(() => Number(invoice.value?.total ?? 0))
const alreadyPaid = computed(() => Number(invoice.value?.amount_paid ?? 0))
const outstanding = computed(() => total.value - alreadyPaid.value)

// The new running total, not just this payment — `amount_paid` is cumulative.
const newAmountPaid = computed(() => alreadyPaid.value + (Number(amount.value) || 0))
const settlesInFull = computed(() => newAmountPaid.value >= total.value - 0.005)

watch(open, async (isOpen) => {
  if (!isOpen || !props.invoiceId) return

  invoice.value = null
  amount.value = ''
  amountError.value = ''
  reset()

  loading.value = true
  try {
    invoice.value = await getInvoice(props.invoiceId)
    // Paying the balance is the common case, so start there.
    amount.value = String(Number(invoice.value.balance_due ?? 0))
  } catch (caught) {
    error.value = caught
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  const value = Number(amount.value)

  if (!(value > 0)) {
    amountError.value = 'Enter an amount greater than zero.'
    return
  }
  // Mirrors the `invoices_paid_within_total` check constraint.
  if (newAmountPaid.value > total.value + 0.005) {
    amountError.value = `That is more than the ${formatCurrency(outstanding.value, {
      decimals: true,
    })} outstanding.`
    return
  }
  amountError.value = ''

  const updated = await submit(() =>
    recordInvoicePayment(props.invoiceId, newAmountPaid.value, {
      // A part payment leaves the invoice where it is; only a full settlement
      // flips it to paid.
      markPaid: settlesInFull.value,
    }),
  )

  if (updated) {
    open.value = false
    emit('recorded', updated)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Record payment"
    :subtitle="invoice ? `${invoice.number} · due ${formatDate(invoice.due_date)}` : ''"
    :busy="submitting"
  >
    <p v-if="loading" class="text-sm text-slate-500">Loading invoice…</p>

    <form v-else-if="invoice" id="record-payment-form" @submit.prevent="onSubmit">
      <dl class="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-slate-500">Invoice total</dt>
          <dd class="mt-1 text-sm font-semibold text-ink tabular-nums">
            {{ formatCurrency(total, { decimals: true }) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">Already paid</dt>
          <dd class="mt-1 text-sm font-semibold text-ink tabular-nums">
            {{ formatCurrency(alreadyPaid, { decimals: true }) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">Outstanding</dt>
          <dd class="mt-1 text-sm font-semibold text-brand-600 tabular-nums">
            {{ formatCurrency(outstanding, { decimals: true }) }}
          </dd>
        </div>
      </dl>

      <div class="mt-5">
        <FormField
          v-model="amount"
          label="Payment received"
          type="number"
          min="0"
          step="0.01"
          required
          :error="amountError"
          :hint="
            amountError
              ? ''
              : settlesInFull
                ? 'Settles the invoice in full — it will be marked paid.'
                : `Leaves ${formatCurrency(total - newAmountPaid, { decimals: true })} outstanding.`
          "
        />
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error.message }}</p>
    </form>

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
        form="record-payment-form"
        :disabled="submitting || loading || !invoice"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Recording…' : 'Record payment' }}
      </button>
    </template>
  </BaseModal>
</template>
