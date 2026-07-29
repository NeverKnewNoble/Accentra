<script setup>
import { computed } from 'vue'
import { CircleCheck, Clock, TriangleAlert } from 'lucide-vue-next'

const props = defineProps({
  buckets: { type: Array, default: () => [] },
})

// Status drives both the icon and the colour, so the bar segments and the
// legend below stay in sync with the shared status vocabulary.
const VISUALS = {
  Paid: { icon: CircleCheck, bar: 'bg-emerald-500', text: 'text-emerald-600' },
  Sent: { icon: Clock, bar: 'bg-brand-500', text: 'text-brand-600' },
  Overdue: { icon: TriangleAlert, bar: 'bg-red-500', text: 'text-red-600' },
}

const FALLBACK = { icon: Clock, bar: 'bg-slate-300', text: 'text-slate-500' }

function visual(status) {
  return VISUALS[status] ?? FALLBACK
}

const totalCount = computed(() =>
  props.buckets.reduce((sum, bucket) => sum + Number(bucket.count ?? 0), 0),
)
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header>
      <h2 class="text-base font-semibold text-ink">Invoice status</h2>
      <p class="mt-1 text-sm text-slate-500">{{ totalCount }} invoices this quarter</p>
    </header>

    <template v-if="buckets.length">
      <!-- Single stacked bar reads faster than three separate meters. -->
      <div class="mt-6 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          v-for="bucket in buckets"
          :key="bucket.label"
          class="h-full transition-all duration-500"
          :class="visual(bucket.status).bar"
          :style="{ width: `${bucket.share}%` }"
        ></div>
      </div>

      <ul class="mt-6 space-y-4">
        <li
          v-for="bucket in buckets"
          :key="bucket.label"
          class="flex items-center justify-between gap-3"
        >
          <span class="flex min-w-0 items-center gap-3">
            <component
              :is="visual(bucket.status).icon"
              class="size-4 shrink-0"
              :class="visual(bucket.status).text"
            />
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-ink">{{ bucket.label }}</span>
              <span class="block text-xs text-slate-400">{{ bucket.count }} invoices</span>
            </span>
          </span>
          <span class="shrink-0 text-sm font-semibold text-ink tabular-nums">
            {{ bucket.amount }}
          </span>
        </li>
      </ul>
    </template>

    <p v-else class="mt-6 text-sm text-slate-400">No invoices raised yet.</p>

    <RouterLink
      to="/portal/invoices"
      class="mt-6 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-slate-50"
    >
      Manage invoices
    </RouterLink>
  </section>
</template>
