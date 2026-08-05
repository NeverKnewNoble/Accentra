<script setup>
import { useId } from 'vue'

/** Multi-line counterpart to FormField, for notes and addresses. */
defineProps({
  label: { type: String, required: true },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})

const model = defineModel({ type: String, default: '' })

const id = useId()
const hintId = `${id}-hint`
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}
      <span v-if="required" class="text-brand-600" aria-hidden="true">*</span>
    </label>

    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? hintId : undefined"
      class="w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
      :class="error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'"
    ></textarea>

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
