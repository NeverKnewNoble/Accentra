<script setup>
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import { createExpenseCategory } from '../../services/expenseService'

/** Adds a row to `expense_categories` (§3.8) without leaving the expense form. */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { ensureOrganization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const name = ref('')
const nameError = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  nameError.value = ''
  reset()
})

async function onSubmit() {
  if (!name.value.trim()) {
    nameError.value = 'Give the category a name.'
    return
  }
  nameError.value = ''

  const created = await submit(async () =>
    createExpenseCategory(await ensureOrganization(), name.value),
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
    title="New expense category"
    subtitle="Categories drive the spend breakdown and the profit and loss statement."
    size="sm"
    :busy="submitting"
  >
    <form id="new-category-form" @submit.prevent="onSubmit">
      <FormField
        v-model="name"
        label="Category name"
        placeholder="Subscriptions"
        required
        :error="nameError"
      />
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
        form="new-category-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Adding…' : 'Add category' }}
      </button>
    </template>
  </BaseModal>
</template>
