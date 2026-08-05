<script setup>
import { computed, ref, watch } from 'vue'
import { FileUp } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import {
  listExpensesMissingReceipts,
  uploadReceipt,
} from '../../services/expenseService'

/**
 * Attaches a file to an existing claim.
 *
 * Receipts live at `{organization_id}/{expense_id}/{filename}` because the
 * storage policy (§8.3) reads the first path segment to decide access — so the
 * expense has to be picked before anything can be uploaded.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['uploaded'])

const { ensureOrganization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const expenses = ref([])
const loadingList = ref(false)
const selectedId = ref('')
const file = ref(null)
const formError = ref('')

const canSubmit = computed(() => Boolean(selectedId.value && file.value))

watch(open, async (isOpen) => {
  if (!isOpen) return

  selectedId.value = ''
  file.value = null
  formError.value = ''
  reset()

  loadingList.value = true
  try {
    expenses.value = await listExpensesMissingReceipts(await ensureOrganization())
  } catch (caught) {
    error.value = caught
  } finally {
    loadingList.value = false
  }
})

function onFileChange(event) {
  file.value = event.target.files?.[0] ?? null
}

async function onSubmit() {
  if (!canSubmit.value) {
    formError.value = 'Pick an expense and choose a file.'
    return
  }
  formError.value = ''

  const result = await submit(async () =>
    uploadReceipt(await ensureOrganization(), selectedId.value, file.value),
  )

  if (result) {
    open.value = false
    emit('uploaded', result)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Upload receipt"
    subtitle="Attach proof to a claim that does not have one yet."
    size="lg"
    :busy="submitting"
  >
    <form id="upload-receipt-form" class="space-y-5" @submit.prevent="onSubmit">
      <div>
        <span class="mb-1.5 block text-sm font-medium text-ink">
          Expense
          <span class="text-brand-600" aria-hidden="true">*</span>
        </span>

        <p v-if="loadingList" class="text-sm text-slate-500">Loading claims…</p>

        <p
          v-else-if="!expenses.length"
          class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
        >
          Every expense already has a receipt attached.
        </p>

        <ul v-else class="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          <li v-for="expense in expenses" :key="expense.id">
            <label
              class="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              :class="selectedId === expense.id ? 'bg-brand-50/70' : ''"
            >
              <input
                v-model="selectedId"
                type="radio"
                :value="expense.id"
                name="receipt-expense"
                class="size-4 shrink-0 border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink">{{ expense.vendor }}</span>
                <span class="block text-xs text-slate-400">
                  {{ expense.date }} · {{ expense.status }}
                </span>
              </span>
              <span class="shrink-0 text-sm font-semibold text-ink tabular-nums">
                {{ expense.amount }}
              </span>
            </label>
          </li>
        </ul>
      </div>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-ink">
          File
          <span class="text-brand-600" aria-hidden="true">*</span>
        </span>
        <label
          class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40"
        >
          <FileUp class="size-4.5 shrink-0 text-slate-400" />
          <span class="truncate">{{ file?.name ?? 'Choose an image or PDF' }}</span>
          <input
            type="file"
            class="sr-only"
            accept="image/*,application/pdf"
            @change="onFileChange"
          />
        </label>
      </div>

      <p v-if="formError || error" class="text-sm text-red-600" role="alert">
        {{ formError || error.message }}
      </p>
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
        form="upload-receipt-form"
        :disabled="submitting || !expenses.length"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Uploading…' : 'Upload receipt' }}
      </button>
    </template>
  </BaseModal>
</template>
