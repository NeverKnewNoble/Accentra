<script setup>
import { ref, watch } from 'vue'
import { Pencil, Plus } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import AddEmployeeModal from './AddEmployeeModal.vue'
import StatusPill from '../portal/StatusPill.vue'
import { useOrganization } from '../../composables/useOrganization'
import { listEmployeesRaw } from '../../services/payrollService'
import { formatDate, formatPayRate, formatStatus } from '../../utils/format'

/**
 * The team roster, including people who have left — `listEmployees` on the page
 * behind this hides them, but you still need a way to correct a record after
 * someone is gone.
 */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['changed'])

const { ensureOrganization } = useOrganization()

const employees = ref([])
const loading = ref(false)
const error = ref(null)
const editing = ref(null)
const showEditor = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    employees.value = await listEmployeesRaw(await ensureOrganization(), {
      activeOnly: false,
    })
  } catch (caught) {
    error.value = caught
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) load()
})

function edit(employee) {
  editing.value = employee
  showEditor.value = true
}

function add() {
  editing.value = null
  showEditor.value = true
}

async function onSaved() {
  await load()
  emit('changed')
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Manage team"
    subtitle="Everyone on the payroll, past and present."
    size="lg"
  >
    <p v-if="loading" class="text-sm text-slate-500">Loading the team…</p>
    <p v-else-if="error" class="text-sm text-red-600" role="alert">{{ error.message }}</p>

    <p
      v-else-if="!employees.length"
      class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
    >
      Nobody on payroll yet.
    </p>

    <ul v-else class="divide-y divide-slate-100 rounded-xl border border-slate-200">
      <li
        v-for="employee in employees"
        :key="employee.id"
        class="flex flex-wrap items-center gap-4 px-4 py-3.5"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-ink">{{ employee.full_name }}</span>
          <span class="block truncate text-xs text-slate-400">
            {{ employee.role_title || '—' }} · started {{ formatDate(employee.started_on) }}
          </span>
        </span>

        <StatusPill :status="formatStatus(employee.status)" />

        <span class="text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
          {{ formatPayRate(employee.pay_rate, employee.employment_type) }}
        </span>

        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
          :aria-label="`Edit ${employee.full_name}`"
          @click="edit(employee)"
        >
          <Pencil class="size-4" />
        </button>
      </li>
    </ul>

    <AddEmployeeModal v-model:open="showEditor" :employee="editing" @saved="onSaved" />

    <template #footer="{ close }">
      <button
        type="button"
        class="mr-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
        @click="add"
      >
        <Plus class="size-4 text-slate-400" />
        Add employee
      </button>
      <button
        type="button"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
        @click="close"
      >
        Done
      </button>
    </template>
  </BaseModal>
</template>
