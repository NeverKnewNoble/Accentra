<script setup>
import { Search } from 'lucide-vue-next'

defineProps({
  placeholder: { type: String, default: 'Search…' },
})
const model = defineModel({ type: String, default: '' })
</script>

<template>
  <div class="relative w-full sm:max-w-xs">
    <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
    <input
      v-model="model"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
    />
  </div>
</template>
