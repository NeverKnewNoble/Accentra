<script setup>
// Segmented filter control shared by the invoice, expense and transaction
// tables. Purely local state — filtering itself happens on the page.
defineProps({
  options: { type: Array, required: true },
})
const model = defineModel({ type: String, required: true })
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
    <button
      v-for="option in options"
      :key="option"
      type="button"
      class="rounded-lg px-3.5 py-2 text-xs font-semibold transition"
      :class="
        model === option
          ? 'bg-white text-ink shadow-sm'
          : 'text-slate-500 hover:text-ink'
      "
      :aria-pressed="model === option"
      @click="model = option"
    >
      {{ option }}
    </button>
  </div>
</template>
