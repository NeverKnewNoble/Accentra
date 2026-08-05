<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Download, Info } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import FormField from '../ui/FormField.vue'
import { useOrganization } from '../../composables/useOrganization'
import { generateReport, reportUnavailableReason, resolvePeriod } from '../../services/reportService'
import { downloadCsv, timestampedName } from '../../utils/csv'

/**
 * Builds one statement over a date range, shows it, and downloads it.
 *
 * A report the schema cannot honestly produce says why instead of rendering
 * something plausible — see `reportUnavailableReason`.
 */
const props = defineProps({
  kind: { type: String, default: 'profit-and-loss' },
  title: { type: String, default: 'Report' },
  period: { type: String, default: 'Year to date' },
})

const open = defineModel('open', { type: Boolean, default: false })

const { ensureOrganization } = useOrganization()

const range = reactive({ start: '', end: '' })
const result = ref(null)
const loading = ref(false)
const error = ref(null)

const unavailable = computed(() => reportUnavailableReason(props.kind))

const slug = computed(() => props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))

watch(open, (isOpen) => {
  if (!isOpen) return

  const resolved = resolvePeriod(props.period)
  range.start = resolved.start
  range.end = resolved.end
  result.value = null
  error.value = null

  if (!unavailable.value) run()
})

async function run() {
  if (!range.start || !range.end) return
  if (range.end < range.start) {
    error.value = new Error('The end date cannot be before the start date.')
    return
  }

  loading.value = true
  error.value = null
  try {
    result.value = await generateReport(await ensureOrganization(), props.kind, {
      start: range.start,
      end: range.end,
    })
  } catch (caught) {
    error.value = caught
    result.value = null
  } finally {
    loading.value = false
  }
}

function download() {
  if (!result.value?.rows.length) return
  downloadCsv(timestampedName(slug.value), result.value.rows, result.value.columns)
}
</script>

<template>
  <BaseModal v-model:open="open" :title="title" size="lg">
    <!-- Reports this schema cannot back with real figures -->
    <div
      v-if="unavailable"
      class="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4"
    >
      <Info class="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div>
        <p class="text-sm font-semibold text-amber-900">Not available yet</p>
        <p class="mt-1 text-sm leading-relaxed text-amber-800">{{ unavailable }}</p>
      </div>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-end gap-4">
        <div class="min-w-40 flex-1">
          <FormField v-model="range.start" label="From" type="date" />
        </div>
        <div class="min-w-40 flex-1">
          <FormField v-model="range.end" label="To" type="date" />
        </div>
        <button
          type="button"
          :disabled="loading"
          class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          @click="run"
        >
          {{ loading ? 'Generating…' : 'Generate' }}
        </button>
      </div>

      <p v-if="error" class="mt-5 text-sm text-red-600" role="alert">{{ error.message }}</p>

      <p
        v-else-if="result && !result.rows.length"
        class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
      >
        Nothing falls inside this period.
      </p>

      <div v-else-if="result" class="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              <th
                v-for="(column, index) in result.columns"
                :key="column.key"
                scope="col"
                class="px-4 py-2.5 font-medium"
                :class="index ? 'text-right' : ''"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in result.rows"
              :key="rowIndex"
              class="border-b border-slate-50 last:border-0"
              :class="row.emphasis ? 'bg-slate-50/60' : ''"
            >
              <td
                v-for="(column, index) in result.columns"
                :key="column.key"
                class="px-4 py-3 text-sm"
                :class="[
                  index ? 'text-right tabular-nums' : '',
                  row.emphasis ? 'font-semibold text-ink' : 'text-slate-600',
                ]"
              >
                {{ row[column.key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #footer="{ close }">
      <button
        type="button"
        class="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
        @click="close"
      >
        Close
      </button>
      <button
        v-if="!unavailable"
        type="button"
        :disabled="!result?.rows?.length"
        class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="download"
      >
        <Download class="size-4" />
        Download CSV
      </button>
    </template>
  </BaseModal>
</template>
