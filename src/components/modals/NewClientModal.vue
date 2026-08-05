<script setup>
import { reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import TextareaField from '../ui/TextareaField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import { createClient } from '../../services/invoiceService'

/** Adds a row to `clients` (§3.5). */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { ensureOrganization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  paymentTerms: 14,
})

const nameError = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, { name: '', email: '', phone: '', address: '', paymentTerms: 14 })
  nameError.value = ''
  reset()
})

async function onSubmit() {
  if (!form.name.trim()) {
    nameError.value = 'Give the client a name.'
    return
  }
  nameError.value = ''

  const created = await submit(async () =>
    createClient(await ensureOrganization(), {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      paymentTerms: Number(form.paymentTerms) || 14,
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
    title="New client"
    subtitle="Everyone you invoice needs a record here first."
    :busy="submitting"
  >
    <form id="new-client-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="sm:col-span-2">
        <FormField
          v-model="form.name"
          label="Client name"
          placeholder="Northwind Ltd"
          autocomplete="organization"
          required
          :error="nameError"
        />
      </div>

      <FormField
        v-model="form.email"
        label="Billing email"
        type="email"
        placeholder="ap@northwind.co"
        autocomplete="email"
      />
      <FormField v-model="form.phone" label="Phone" type="tel" autocomplete="tel" />

      <FormField
        v-model="form.paymentTerms"
        label="Payment terms"
        type="number"
        min="0"
        step="1"
        hint="Days. Sets the default due date on their invoices."
      />

      <div class="sm:col-span-2">
        <TextareaField v-model="form.address" label="Address" :rows="2" />
      </div>

      <p v-if="error" class="text-sm text-red-600 sm:col-span-2" role="alert">
        {{ error.message }}
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
        form="new-client-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Adding…' : 'Add client' }}
      </button>
    </template>
  </BaseModal>
</template>
