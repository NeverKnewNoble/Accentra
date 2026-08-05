<script setup>
import { useId } from 'vue'

/**
 * Labelled select, styled to match FormField so the two can sit side by side in
 * the same grid without looking like different form libraries.
 *
 * `options` takes either plain strings or `{ value, label }` pairs.
 */
defineProps({
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const model = defineModel({ type: [String, Number], default: '' })

const id = useId()
const hintId = `${id}-hint`

const valueOf = (option) => (typeof option === 'object' ? option.value : option)
const labelOf = (option) => (typeof option === 'object' ? option.label : option)
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-baseline justify-between gap-3">
      <label :for="id" class="block text-sm font-medium text-ink">
        {{ label }}
        <span v-if="required" class="text-brand-600" aria-hidden="true">*</span>
      </label>
      <slot name="action" />
    </div>

    <select
      :id="id"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? hintId : undefined"
      class="w-full appearance-none rounded-xl border bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%2394a3b8%27 stroke-linecap=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_0.75rem_center] bg-no-repeat px-4 py-3 pr-11 text-[15px] text-ink shadow-sm transition hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      :class="error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="valueOf(option)"
        :value="valueOf(option)"
      >
        {{ labelOf(option) }}
      </option>
    </select>

    <p
      v-if="error || hint"
      :id="hintId"
      class="mt-1.5 text-xs"
      :class="error ? 'text-red-600' : 'text-slate-500'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
