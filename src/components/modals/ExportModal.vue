<script setup>
import { computed, ref, watch } from 'vue'
import { Download } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { downloadCsv, timestampedName } from '../../utils/csv'

/**
 * Turns whatever a page is showing into a CSV.
 *
 * Pass `rows` when the page already holds them — no second round trip for data
 * that is on screen — or `fetchRows` when the export should cover more than the
 * current page of results.
 */
const props = defineProps({
  title: { type: String, default: 'Export' },
  subtitle: { type: String, default: 'Downloads a CSV of the rows below.' },
  filename: { type: String, required: true },
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  fetchRows: { type: Function, default: null },
})

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['exported'])

const { submitting, error, submit, reset } = useFormSubmit()

const loaded = ref([])
const loading = ref(false)
const selectedKeys = ref([])

const availableRows = computed(() => (props.fetchRows ? loaded.value : props.rows))

const selectedColumns = computed(() =>
  props.columns.filter((column) => selectedKeys.value.includes(column.key)),
)

watch(open, async (isOpen) => {
  if (!isOpen) return

  selectedKeys.value = props.columns.map((column) => column.key)
  loaded.value = []
  reset()

  if (!props.fetchRows) return

  loading.value = true
  try {
    loaded.value = (await props.fetchRows()) ?? []
  } catch (caught) {
    error.value = caught
  } finally {
    loading.value = false
  }
})

function toggleColumn(key) {
  // Order comes from `props.columns` via `selectedColumns`, so this only has to
  // track membership.
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((existing) => existing !== key)
    : [...selectedKeys.value, key]
}

async function onExport() {
  const done = await submit(async () => {
    downloadCsv(timestampedName(props.filename), availableRows.value, selectedColumns.value)
    return true
  })

  if (done) {
    open.value = false
    emit('exported', availableRows.value.length)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="title"
    :subtitle="subtitle"
    :busy="submitting"
  >
    <p v-if="loading" class="text-sm text-slate-500">Gathering rows…</p>

    <template v-else>
      <p class="text-sm text-slate-600">
        <span class="font-semibold text-ink">{{ availableRows.length }}</span>
        {{ availableRows.length === 1 ? 'row' : 'rows' }} will be exported.
      </p>

      <fieldset class="mt-5">
        <legend class="text-sm font-medium text-ink">Columns</legend>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label
            v-for="column in columns"
            :key="column.key"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
          >
            <input
              type="checkbox"
              class="size-4 rounded border-slate-300 text-brand-600 focus:ring-4 focus:ring-brand-100"
              :checked="selectedKeys.includes(column.key)"
              @change="toggleColumn(column.key)"
            />
            <span class="text-sm text-slate-600">{{ column.label }}</span>
          </label>
        </div>
      </fieldset>

      <p v-if="!selectedColumns.length" class="mt-4 text-sm text-red-600" role="alert">
        Choose at least one column.
      </p>
      <p v-else-if="error" class="mt-4 text-sm text-red-600" role="alert">
        {{ error.message }}
      </p>
    </template>

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
        type="button"
        :disabled="submitting || loading || !selectedColumns.length || !availableRows.length"
        class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="onExport"
      >
        <Download class="size-4" />
        {{ submitting ? 'Preparing…' : 'Download CSV' }}
      </button>
    </template>
  </BaseModal>
</template>
