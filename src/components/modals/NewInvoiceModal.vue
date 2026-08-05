<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import NewClientModal from './NewClientModal.vue'
import FormField from '../ui/FormField.vue'
import SelectField from '../ui/SelectField.vue'
import TextareaField from '../ui/TextareaField.vue'
import { useAuth } from '../../composables/useAuth'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import {
  createInvoice,
  getNextInvoiceNumber,
  listClients,
} from '../../services/invoiceService'
import { formatCurrency } from '../../utils/format'

/**
 * Raises an invoice (§3.6) and its lines (§3.7).
 *
 * The totals shown here are a preview only — nothing computed in this file is
 * sent. `recalc_invoice_totals` (§6.2) fires on the line insert and writes
 * subtotal, tax and total itself, so there is exactly one place the arithmetic
 * can be wrong, and it is not this one.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { user } = useAuth()
const { ensureOrganization, organization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const DEFAULT_VAT = 15 // Ghana standard rate

const today = () => new Date().toISOString().slice(0, 10)
const emptyLine = () => ({
  description: '',
  quantity: 1,
  unitPrice: '',
  taxRate: DEFAULT_VAT,
  stream: '',
})

const form = reactive({
  clientId: '',
  number: '',
  issueDate: today(),
  dueDate: '',
  notes: '',
})

const lines = ref([emptyLine()])
const clients = ref([])
const showNewClient = ref(false)
const fieldErrors = reactive({ clientId: '', number: '', dueDate: '', lines: '' })

const currency = computed(() => organization.value?.base_currency ?? 'GHS')

const clientOptions = computed(() =>
  clients.value.map((row) => ({ value: row.id, label: row.name })),
)

/* Preview of what the trigger will write, so nobody has to save to see it. */
const totals = computed(() => {
  let subtotal = 0
  let tax = 0

  for (const line of lines.value) {
    const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
    subtotal += lineTotal
    tax += (lineTotal * (Number(line.taxRate) || 0)) / 100
  }

  return { subtotal, tax, total: subtotal + tax }
})

const hasUsableLine = computed(() =>
  lines.value.some((line) => line.description.trim() && Number(line.unitPrice) > 0),
)

async function loadReferenceData() {
  const orgId = await ensureOrganization()
  const [loadedClients, nextNumber] = await Promise.all([
    listClients(orgId),
    getNextInvoiceNumber(orgId),
  ])
  clients.value = loadedClients
  form.number = nextNumber
}

watch(open, (isOpen) => {
  if (!isOpen) return

  Object.assign(form, {
    clientId: '',
    number: '',
    issueDate: today(),
    dueDate: '',
    notes: '',
  })
  Object.assign(fieldErrors, { clientId: '', number: '', dueDate: '', lines: '' })
  lines.value = [emptyLine()]
  autoFilled = ''
  reset()

  loadReferenceData().catch((caught) => {
    error.value = caught
  })
})

/**
 * Default the due date from the client's payment terms whenever either half of
 * that sum changes.
 *
 * `autoFilled` remembers what this last wrote, which is how a date the user
 * typed survives: if the field holds anything other than our own last value,
 * it was set by hand and is left alone.
 */
let autoFilled = ''

watch(
  () => [form.clientId, form.issueDate],
  () => {
    if (!form.clientId || !form.issueDate) return
    if (form.dueDate && form.dueDate !== autoFilled) return

    const client = clients.value.find((row) => row.id === form.clientId)
    const due = new Date(form.issueDate)
    due.setDate(due.getDate() + (client?.payment_terms ?? 14))

    autoFilled = due.toISOString().slice(0, 10)
    form.dueDate = autoFilled
  },
)

function onClientCreated(client) {
  clients.value = [...clients.value, client].sort((a, b) => a.name.localeCompare(b.name))
  form.clientId = client.id
}

function addLine() {
  lines.value.push(emptyLine())
}

function removeLine(index) {
  lines.value.splice(index, 1)
  if (!lines.value.length) lines.value.push(emptyLine())
}

function lineTotal(line) {
  return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
}

function validate() {
  fieldErrors.clientId = form.clientId ? '' : 'Choose who this is for.'
  fieldErrors.number = form.number.trim() ? '' : 'Every invoice needs a number.'

  // Mirrors the `invoices_due_after_issue` check constraint, so the database
  // never has to be the one to say no.
  if (!form.dueDate) {
    fieldErrors.dueDate = 'Pick a due date.'
  } else if (form.dueDate < form.issueDate) {
    fieldErrors.dueDate = 'The due date cannot be before the issue date.'
  } else {
    fieldErrors.dueDate = ''
  }

  fieldErrors.lines = hasUsableLine.value
    ? ''
    : 'Add at least one line with a description and a price.'

  return !Object.values(fieldErrors).some(Boolean)
}

async function save(status) {
  if (!validate()) return

  const created = await submit(async () =>
    createInvoice(await ensureOrganization(), {
      clientId: form.clientId,
      number: form.number.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: form.notes.trim(),
      currency: currency.value,
      status,
      createdBy: user.value?.id ?? null,
      lines: lines.value
        .filter((line) => line.description.trim())
        .map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity) || 1,
          unitPrice: Number(line.unitPrice) || 0,
          taxRate: Number(line.taxRate) || 0,
          stream: line.stream.trim(),
        })),
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
    title="New invoice"
    subtitle="Totals are calculated by the database from the lines below."
    size="xl"
    :busy="submitting"
  >
    <form id="new-invoice-form" class="space-y-6" @submit.prevent="save('draft')">
      <div class="grid gap-5 sm:grid-cols-2">
        <SelectField
          v-model="form.clientId"
          label="Client"
          placeholder="Choose a client"
          :options="clientOptions"
          required
          :error="fieldErrors.clientId"
        >
          <template #action>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              @click="showNewClient = true"
            >
              <Plus class="size-3.5" />
              New client
            </button>
          </template>
        </SelectField>

        <FormField
          v-model="form.number"
          label="Invoice number"
          placeholder="INV-2206"
          required
          :error="fieldErrors.number"
          :hint="fieldErrors.number ? '' : 'Prefilled from your last invoice.'"
        />

        <FormField v-model="form.issueDate" label="Issue date" type="date" required />
        <FormField
          v-model="form.dueDate"
          label="Due date"
          type="date"
          required
          :error="fieldErrors.dueDate"
          :hint="fieldErrors.dueDate ? '' : 'Defaults to the client’s payment terms.'"
        />
      </div>

      <!-- Line items -->
      <section>
        <header class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-ink">Line items</h3>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50"
            @click="addLine"
          >
            <Plus class="size-3.5" />
            Add line
          </button>
        </header>

        <div class="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full min-w-3xl text-left">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
                <th scope="col" class="px-3 py-2.5 font-medium">Description</th>
                <th scope="col" class="w-24 px-3 py-2.5 font-medium">Qty</th>
                <th scope="col" class="w-32 px-3 py-2.5 font-medium">Unit price</th>
                <th scope="col" class="w-24 px-3 py-2.5 font-medium">VAT %</th>
                <th scope="col" class="w-36 px-3 py-2.5 font-medium">Stream</th>
                <th scope="col" class="w-28 px-3 py-2.5 text-right font-medium">Total</th>
                <th scope="col" class="w-10 px-3 py-2.5"><span class="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="index" class="border-b border-slate-50 last:border-0">
                <td class="px-3 py-2">
                  <input
                    v-model="line.description"
                    type="text"
                    placeholder="Monthly retainer"
                    :aria-label="`Line ${index + 1} description`"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="line.quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                    :aria-label="`Line ${index + 1} quantity`"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="line.unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    :aria-label="`Line ${index + 1} unit price`"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink tabular-nums transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="line.taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    :aria-label="`Line ${index + 1} VAT rate`"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink tabular-nums transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model="line.stream"
                    type="text"
                    placeholder="Retainers"
                    :aria-label="`Line ${index + 1} revenue stream`"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </td>
                <td class="px-3 py-2 text-right text-sm font-medium text-ink tabular-nums">
                  {{ formatCurrency(lineTotal(line), { decimals: true }) }}
                </td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    :aria-label="`Remove line ${index + 1}`"
                    @click="removeLine(index)"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="fieldErrors.lines" class="mt-2 text-sm text-red-600" role="alert">
          {{ fieldErrors.lines }}
        </p>

        <dl class="mt-4 ml-auto grid max-w-xs gap-2 text-sm">
          <div class="flex items-baseline justify-between gap-6">
            <dt class="text-slate-500">Subtotal</dt>
            <dd class="font-medium text-ink tabular-nums">
              {{ formatCurrency(totals.subtotal, { decimals: true }) }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-6">
            <dt class="text-slate-500">VAT</dt>
            <dd class="font-medium text-ink tabular-nums">
              {{ formatCurrency(totals.tax, { decimals: true }) }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-6 border-t border-slate-100 pt-2">
            <dt class="font-semibold text-ink">Total</dt>
            <dd class="text-base font-semibold text-brand-600 tabular-nums">
              {{ formatCurrency(totals.total, { decimals: true }) }}
            </dd>
          </div>
        </dl>
      </section>

      <TextareaField
        v-model="form.notes"
        label="Notes"
        placeholder="Payment details, terms, thanks — anything that should appear on the invoice."
      />

      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error.message }}</p>
    </form>

    <NewClientModal v-model:open="showNewClient" @created="onClientCreated" />

    <template #footer="{ close }">
      <button
        type="button"
        :disabled="submitting"
        class="mr-auto rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        @click="close"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-invoice-form"
        :disabled="submitting"
        class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Saving…' : 'Save as draft' }}
      </button>
      <button
        type="button"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="save('sent')"
      >
        Save and mark sent
      </button>
    </template>
  </BaseModal>
</template>
