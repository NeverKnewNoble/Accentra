<script setup>
import { computed, ref, useId } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  // Passed straight through for number and date inputs.
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  disabled: { type: Boolean, default: false },
})

// Number and date inputs bind a Number or an empty string, so the model cannot
// be String-only.
const model = defineModel({ type: [String, Number], default: '' })

const id = useId()
const hintId = `${id}-hint`
const revealed = ref(false)

const isPassword = computed(() => props.type === 'password')
// Toggling `type` on a password field lets the browser keep the value while
// the user peeks at what they typed.
const resolvedType = computed(() =>
  isPassword.value && revealed.value ? 'text' : props.type,
)
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}
      <span v-if="required" class="text-brand-600" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="resolvedType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error || hint ? hintId : undefined"
        class="w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        :class="[
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200',
          isPassword ? 'pr-12' : '',
        ]"
      />

      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-slate-400 transition hover:text-brand-600"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <template v-if="!revealed">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
          </template>
          <template v-else>
            <path d="M3 3l18 18" stroke-linecap="round" />
            <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.3 3.9M6.4 8.2A16.8 16.8 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 3.5-.65" />
          </template>
        </svg>
      </button>
    </div>

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
