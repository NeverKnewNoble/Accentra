<script setup>
import { computed, ref, watch } from 'vue'
import { Ban, Banknote, Send, Trash2 } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import RecordPaymentModal from './RecordPaymentModal.vue'
import StatusPill from '../portal/StatusPill.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { deleteInvoice, updateInvoiceStatus } from '../../services/invoiceService'

/**
 * What you can do to one invoice from its row.
 *
 * `invoice` is the display row the table already holds, so opening this costs
 * no extra query — only the payment dialog needs the full record, and it
 * fetches that itself.
 */
const props = defineProps({
  invoice: { type: Object, default: null },
})

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['changed'])

const { submitting, error, submit, reset } = useFormSubmit()

const showPayment = ref(false)
const showDelete = ref(false)

const status = computed(() => (props.invoice?.status ?? '').toLowerCase())
const isSettled = computed(() => status.value === 'paid' || status.value === 'void')

watch(open, (isOpen) => {
  if (isOpen) reset()
})

async function setStatus(next) {
  const updated = await submit(() => updateInvoiceStatus(props.invoice.id, next))
  if (updated) {
    open.value = false
    emit('changed', updated)
  }
}

function onPaymentRecorded(updated) {
  open.value = false
  emit('changed', updated)
}

function onDeleted() {
  open.value = false
  emit('changed', null)
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="invoice ? `Invoice ${invoice.number}` : 'Invoice'"
    :subtitle="invoice ? `${invoice.client} · issued ${invoice.issued}` : ''"
    size="sm"
    :busy="submitting"
  >
    <template v-if="invoice">
      <dl class="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div>
          <dt class="text-xs text-slate-500">Amount</dt>
          <dd class="mt-1 text-sm font-semibold text-ink tabular-nums">{{ invoice.amount }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">Balance due</dt>
          <dd class="mt-1 text-sm font-semibold text-ink tabular-nums">{{ invoice.balanceDue }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">Due date</dt>
          <dd class="mt-1 text-sm text-slate-600">{{ invoice.due }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">Status</dt>
          <dd class="mt-1"><StatusPill :status="invoice.status" /></dd>
        </div>
      </dl>

      <ul class="mt-5 space-y-1.5">
        <li v-if="status === 'draft'">
          <button
            type="button"
            :disabled="submitting"
            class="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-ink transition hover:bg-slate-100 disabled:opacity-50"
            @click="setStatus('sent')"
          >
            <Send class="size-4 text-slate-400" />
            Mark as sent
          </button>
        </li>
        <li v-if="!isSettled">
          <button
            type="button"
            :disabled="submitting"
            class="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-ink transition hover:bg-slate-100 disabled:opacity-50"
            @click="showPayment = true"
          >
            <Banknote class="size-4 text-slate-400" />
            Record a payment
          </button>
        </li>
        <li v-if="!isSettled">
          <button
            type="button"
            :disabled="submitting"
            class="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-ink transition hover:bg-slate-100 disabled:opacity-50"
            @click="setStatus('void')"
          >
            <Ban class="size-4 text-slate-400" />
            Void this invoice
          </button>
        </li>
        <li>
          <button
            type="button"
            :disabled="submitting"
            class="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            @click="showDelete = true"
          >
            <Trash2 class="size-4" />
            Delete permanently
          </button>
        </li>
      </ul>

      <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error.message }}</p>

      <RecordPaymentModal
        v-model:open="showPayment"
        :invoice-id="invoice.id"
        @recorded="onPaymentRecorded"
      />

      <ConfirmDialog
        v-model:open="showDelete"
        title="Delete this invoice?"
        :message="`${invoice.number} and its line items will be removed. Voiding it instead keeps the record in your ledger.`"
        confirm-label="Delete invoice"
        tone="danger"
        :action="() => deleteInvoice(invoice.id)"
        @confirmed="onDeleted"
      />
    </template>
  </BaseModal>
</template>
