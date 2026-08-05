<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import SelectField from '../ui/SelectField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import { ACCOUNT_TYPES, createAccount } from '../../services/accountService'

/**
 * Adds a row to `accounts` (§3.4) — one of the cards along the top of the
 * transactions page.
 *
 * `opening_balance` is the starting figure the `account_balances` view adds
 * every transaction to, so it should be the balance on the day before the
 * first transaction you plan to record.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const { ensureOrganization, organization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const baseCurrency = computed(() => organization.value?.base_currency ?? 'GHS')

const form = reactive({
  name: '',
  institution: '',
  type: 'bank',
  currency: 'GHS',
  openingBalance: '',
})

const nameError = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form, {
    name: '',
    institution: '',
    type: 'bank',
    currency: baseCurrency.value,
    openingBalance: '',
  })
  nameError.value = ''
  reset()
})

async function onSubmit() {
  if (!form.name.trim()) {
    nameError.value = 'Give the account a name.'
    return
  }
  nameError.value = ''

  const created = await submit(async () =>
    createAccount(await ensureOrganization(), {
      name: form.name.trim(),
      institution: form.institution.trim(),
      type: form.type,
      currency: (form.currency || 'GHS').toUpperCase().slice(0, 3),
      openingBalance: Number(form.openingBalance) || 0,
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
    title="Add account"
    subtitle="Every transaction belongs to one of these."
    :busy="submitting"
  >
    <form id="add-account-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="sm:col-span-2">
        <FormField
          v-model="form.name"
          label="Account name"
          placeholder="Operating — GCB"
          required
          :error="nameError"
        />
      </div>

      <FormField
        v-model="form.institution"
        label="Institution"
        placeholder="GCB Bank"
        hint="Shown beneath the balance on the account card."
      />
      <SelectField v-model="form.type" label="Type" :options="ACCOUNT_TYPES" required />

      <FormField
        v-model="form.openingBalance"
        label="Opening balance"
        type="number"
        step="0.01"
        placeholder="0.00"
        hint="The balance before any recorded transaction."
      />
      <FormField
        v-model="form.currency"
        label="Currency"
        placeholder="GHS"
        hint="Three-letter ISO code."
      />

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
        form="add-account-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Adding…' : 'Add account' }}
      </button>
    </template>
  </BaseModal>
</template>
