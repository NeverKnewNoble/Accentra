<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { ImageUp } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { useAuth } from '../../composables/useAuth'
import { useFormSubmit } from '../../composables/useFormSubmit'
import { uploadAvatar } from '../../services/settingsService'

/** Replaces the profile photo in the `avatars` bucket (§8.2). */
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['uploaded'])

const { user } = useAuth()
const { submitting, error, submit, reset } = useFormSubmit()

const MAX_BYTES = 5 * 1024 * 1024

const file = ref(null)
const previewUrl = ref('')
const formError = ref('')

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

watch(open, (isOpen) => {
  if (isOpen) {
    file.value = null
    formError.value = ''
    clearPreview()
    reset()
  } else {
    clearPreview()
  }
})

onBeforeUnmount(clearPreview)

function onFileChange(event) {
  const chosen = event.target.files?.[0] ?? null
  clearPreview()

  if (chosen && chosen.size > MAX_BYTES) {
    file.value = null
    formError.value = 'That image is over 5 MB. Choose a smaller one.'
    return
  }

  formError.value = ''
  file.value = chosen
  if (chosen) previewUrl.value = URL.createObjectURL(chosen)
}

async function onSubmit() {
  if (!file.value) {
    formError.value = 'Choose an image first.'
    return
  }

  const url = await submit(() => uploadAvatar(user.value.id, file.value))

  if (url) {
    open.value = false
    emit('uploaded', url)
  }
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    title="Upload photo"
    subtitle="Shown next to your name across the portal."
    size="sm"
    :busy="submitting"
  >
    <div class="flex flex-col items-center gap-5">
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Preview of the photo you selected"
        class="size-28 rounded-2xl object-cover shadow-sm"
      />
      <span
        v-else
        class="grid size-28 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
      >
        <ImageUp class="size-7" />
      </span>

      <label
        class="w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40"
      >
        <span class="block truncate">{{ file?.name ?? 'Choose an image' }}</span>
        <input type="file" class="sr-only" accept="image/*" @change="onFileChange" />
      </label>

      <p v-if="formError || error" class="text-sm text-red-600" role="alert">
        {{ formError || error.message }}
      </p>
    </div>

    <template #footer="{ close }">
      <button
        type="button"
        :disabled="submitting"
        class="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        @click="close"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="submitting || !file"
        class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        @click="onSubmit"
      >
        {{ submitting ? 'Uploading…' : 'Upload photo' }}
      </button>
    </template>
  </BaseModal>
</template>
