<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import SelectField from '../ui/SelectField.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { useOrganization } from '../../composables/useOrganization'
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  createEmployee,
  updateEmployee,
} from '../../services/payrollService'

/**
 * Writes `employees` (§3.11) — new hires, and edits to existing ones.
 *
 * Pass `employee` to edit; leave it null to add. Both go through the same form
 * because the field set is identical, and two near-copies of a fifteen-field
 * form is two places to forget a column.
 */
const props = defineProps({
  employee: { type: Object, default: null },
})

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['saved'])

const { ensureOrganization, organization } = useOrganization()
const { submitting, error, submit, reset } = useFormSubmit()

const isEdit = computed(() => Boolean(props.employee?.id))
const baseCurrency = computed(() => organization.value?.base_currency ?? 'GHS')

const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  fullName: '',
  roleTitle: '',
  email: '',
  employmentType: 'salaried',
  status: 'active',
  payRate: '',
  currency: 'GHS',
  startedOn: today(),
  endedOn: '',
  bankAccount: '',
  ssnitNumber: '',
  tin: '',
})

const fieldErrors = reactive({ fullName: '', payRate: '', endedOn: '' })

// Contractors are paid by the hour, salaried staff by the month. The label has
// to say which, or the figure is meaningless.
const payRateLabel = computed(() =>
  form.employmentType === 'contract' ? 'Hourly rate' : 'Monthly gross',
)

watch(open, (isOpen) => {
  if (!isOpen) return

  Object.assign(form, {
    fullName: props.employee?.full_name ?? '',
    roleTitle: props.employee?.role_title ?? '',
    email: props.employee?.email ?? '',
    employmentType: props.employee?.employment_type ?? 'salaried',
    status: props.employee?.status ?? 'active',
    payRate: props.employee?.pay_rate ?? '',
    currency: props.employee?.currency ?? baseCurrency.value,
    startedOn: props.employee?.started_on ?? today(),
    endedOn: props.employee?.ended_on ?? '',
    bankAccount: props.employee?.bank_account ?? '',
    ssnitNumber: props.employee?.ssnit_number ?? '',
    tin: props.employee?.tin ?? '',
  })
  Object.assign(fieldErrors, { fullName: '', payRate: '', endedOn: '' })
  reset()
})

function validate() {
  fieldErrors.fullName = form.fullName.trim() ? '' : 'Enter their name.'
  fieldErrors.payRate =
    Number(form.payRate) >= 0 && form.payRate !== ''
      ? ''
      : 'Enter a pay rate — zero is allowed, blank is not.'
  // Mirrors the `employees_end_after_start` check constraint.
  fieldErrors.endedOn =
    form.endedOn && form.endedOn < form.startedOn
      ? 'The end date cannot be before the start date.'
      : ''

  return !fieldErrors.fullName && !fieldErrors.payRate && !fieldErrors.endedOn
}

async function onSubmit() {
  if (!validate()) return

  const payload = {
    fullName: form.fullName.trim(),
    roleTitle: form.roleTitle.trim(),
    email: form.email.trim(),
    employmentType: form.employmentType,
    status: form.status,
    payRate: Number(form.payRate),
    currency: (form.currency || 'GHS').toUpperCase().slice(0, 3),
    startedOn: form.startedOn,
    endedOn: form.endedOn,
    bankAccount: form.bankAccount.trim(),
    ssnitNumber: form.ssnitNumber.trim(),
    tin: form.tin.trim(),
  }

  const saved = await submit(async () =>
    isEdit.value
      ? updateEmployee(props.employee.id, payload)
      : createEmployee(await ensureOrganization(), payload),
  )

  if (saved) {
    open.value = false
    emit('saved', saved)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="isEdit ? 'Edit employee' : 'Add employee'"
    subtitle="Salary data is visible only to owners, admins, accountants and bookkeepers."
    size="lg"
    :busy="submitting"
  >
    <form id="employee-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="onSubmit">
      <FormField
        v-model="form.fullName"
        label="Full name"
        placeholder="Ada Mensah"
        autocomplete="name"
        required
        :error="fieldErrors.fullName"
      />
      <FormField v-model="form.roleTitle" label="Job title" placeholder="Finance Lead" />

      <FormField v-model="form.email" label="Email" type="email" autocomplete="email" />
      <SelectField
        v-model="form.employmentType"
        label="Employment type"
        :options="EMPLOYMENT_TYPES"
        required
      />

      <FormField
        v-model="form.payRate"
        label="Pay rate"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        required
        :error="fieldErrors.payRate"
        :hint="fieldErrors.payRate ? '' : `${payRateLabel} in ${form.currency || baseCurrency}`"
      />
      <SelectField v-model="form.status" label="Status" :options="EMPLOYEE_STATUSES" required />

      <FormField v-model="form.startedOn" label="Start date" type="date" required />
      <FormField
        v-model="form.endedOn"
        label="End date"
        type="date"
        :error="fieldErrors.endedOn"
        :hint="fieldErrors.endedOn ? '' : 'Leave blank while they are still with you.'"
      />

      <div class="sm:col-span-2">
        <FormField
          v-model="form.bankAccount"
          label="Bank account"
          placeholder="Account number for payment"
        />
      </div>

      <FormField
        v-model="form.ssnitNumber"
        label="SSNIT number"
        hint="Social security number."
      />
      <FormField v-model="form.tin" label="TIN" hint="Taxpayer identification number." />

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
        form="employee-form"
        :disabled="submitting"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add employee' }}
      </button>
    </template>
  </BaseModal>
</template>
