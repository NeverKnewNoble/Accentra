<script setup>
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'

defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  delta: { type: String, default: '' },
  // `up` is about direction, not sentiment — pass `good` to say whether the
  // movement is favourable (rising expenses are "up" but not "good").
  up: { type: Boolean, default: true },
  good: { type: Boolean, default: true },
  icon: { type: [Object, Function], required: true },
  caption: { type: String, default: '' },
})
</script>

<template>
  <article
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:border-brand-200 hover:shadow-card"
  >
    <div class="flex items-start justify-between">
      <span class="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <component :is="icon" class="size-5" />
      </span>
      <span
        v-if="delta"
        class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
        :class="good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
      >
        <component :is="up ? ArrowUpRight : ArrowDownRight" class="size-3.5" />
        {{ delta }}
      </span>
    </div>

    <p class="mt-4 text-sm text-slate-500">{{ label }}</p>
    <p class="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">
      {{ value }}
    </p>
    <p v-if="caption" class="mt-1.5 text-xs text-slate-400">{{ caption }}</p>
  </article>
</template>
