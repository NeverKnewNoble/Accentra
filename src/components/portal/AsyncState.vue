<script setup>
import { computed } from 'vue'
import { RefreshCw, TriangleAlert } from 'lucide-vue-next'
import CardSkeleton from '../skeletons/CardSkeleton.vue'
import ChartSkeleton from '../skeletons/ChartSkeleton.vue'
import StatCardsSkeleton from '../skeletons/StatCardsSkeleton.vue'
import TableSkeleton from '../skeletons/TableSkeleton.vue'

// Wraps any async section: skeleton while loading, a readable error with a
// retry when it fails, and the default slot once there is data.
//
// Single root element on purpose — the default slot can render several nodes,
// and a fragment root makes class/attribute fallthrough unpredictable.
const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [Error, Object, String], default: null },
  // Built-in shape while loading. For anything page-shaped, pass a component
  // through the `skeleton` slot instead — see components/skeletons.
  skeleton: {
    type: String,
    default: 'card',
    validator: (v) => ['card', 'cards', 'table', 'chart', 'none'].includes(v),
  },
})
const emit = defineEmits(['retry'])

const SHAPES = {
  card: CardSkeleton,
  cards: StatCardsSkeleton,
  table: TableSkeleton,
  chart: ChartSkeleton,
  none: null,
}

const shape = computed(() => SHAPES[props.skeleton] ?? null)
</script>

<template>
  <div>
    <!-- Error takes priority: showing a skeleton over a failed load is a lie. -->
    <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert">
      <div class="flex items-start gap-3">
        <TriangleAlert class="mt-0.5 size-5 shrink-0 text-red-600" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-red-900">Could not load this section</p>
          <p class="mt-1 text-sm break-words text-red-700">
            {{ error.message || error }}
          </p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            @click="emit('retry')"
          >
            <RefreshCw class="size-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="loading" aria-busy="true" aria-live="polite">
      <span class="sr-only">Loading…</span>
      <!-- Pages override the shape here when the built-ins are too generic. -->
      <slot name="skeleton">
        <component :is="shape" v-if="shape" />
      </slot>
    </div>

    <slot v-else />
  </div>
</template>
