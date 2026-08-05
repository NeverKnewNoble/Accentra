<script setup>
import { ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'

/**
 * Confirmation for anything irreversible or outward-facing — deleting an
 * invoice, submitting payroll to the bank.
 *
 * Pass `action` and the dialog runs it, holds the error and only closes on
 * success; omit it and the dialog just emits `confirm` for the caller to
 * handle.
 */
const props = defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  tone: { type: String, default: 'brand' }, // brand | danger
  action: { type: Function, default: null },
})

const emit = defineEmits(['confirm', 'confirmed'])

const open = defineModel('open', { type: Boolean, default: false })

const busy = ref(false)
const error = ref(null)

const TONES = {
  brand: 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20',
  danger: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
}

async function onConfirm() {
  if (!props.action) {
    emit('confirm')
    open.value = false
    return
  }

  busy.value = true
  error.value = null
  try {
    const result = await props.action()
    open.value = false
    emit('confirmed', result)
  } catch (caught) {
    error.value = caught
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal v-model:open="open" :title="title" size="sm" :busy="busy">
    <div class="flex gap-4">
      <span
        v-if="tone === 'danger'"
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"
      >
        <TriangleAlert class="size-5" />
      </span>
      <div class="min-w-0">
        <p v-if="message" class="text-sm leading-relaxed text-slate-600">{{ message }}</p>
        <slot />
        <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error.message }}</p>
      </div>
    </div>

    <template #footer="{ close }">
      <button
        type="button"
        :disabled="busy"
        class="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        @click="close"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :disabled="busy"
        class="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="TONES[tone] ?? TONES.brand"
        @click="onConfirm"
      >
        {{ busy ? 'Working…' : confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
