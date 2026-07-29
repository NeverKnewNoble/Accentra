<script setup>
import { RefreshCw, TriangleAlert } from 'lucide-vue-next'

// Wraps any async section: skeleton while loading, a readable error with a
// retry when it fails, and the default slot once there is data.
//
// Single root element on purpose — the default slot can render several nodes,
// and a fragment root makes class/attribute fallthrough unpredictable.
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [Error, Object, String], default: null },
  // Skeleton shape while loading — pages pick whichever matches their layout.
  skeleton: {
    type: String,
    default: 'card',
    validator: (v) => ['card', 'cards', 'table', 'chart', 'none'].includes(v),
  },
})
const emit = defineEmits(['retry'])
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

      <div v-if="skeleton === 'cards'" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="n in 4"
          :key="n"
          class="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
        ></div>
      </div>

      <div
        v-else-if="skeleton === 'table'"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div class="h-16 animate-pulse border-b border-slate-100 bg-slate-50"></div>
        <div
          v-for="n in 5"
          :key="n"
          class="flex items-center gap-4 border-b border-slate-50 px-6 py-4 last:border-0"
        >
          <div class="size-9 animate-pulse rounded-lg bg-slate-100"></div>
          <div class="h-3 flex-1 animate-pulse rounded bg-slate-100"></div>
          <div class="h-3 w-20 animate-pulse rounded bg-slate-100"></div>
        </div>
      </div>

      <div
        v-else-if="skeleton === 'chart'"
        class="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
      ></div>

      <div
        v-else-if="skeleton === 'card'"
        class="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
      ></div>
    </div>

    <slot v-else />
  </div>
</template>
