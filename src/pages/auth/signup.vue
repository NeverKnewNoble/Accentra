<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '../../components/auth/AuthLayout.vue'
import FormField from '../../components/ui/FormField.vue'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { signUp } = useAuth()

const fullName = ref('')
const company = ref('')
const email = ref('')
const password = ref('')
const accepted = ref(false)
const submitting = ref(false)
const formError = ref('')
const sent = ref(false)

const points = [
  'Free for your first 14 days — no card required',
  'Import last year’s ledger in under five minutes',
  'Invite your accountant with read-only access',
]

// Cheap client-side signal only — Supabase enforces the real password policy.
const strength = computed(() => {
  const value = password.value
  if (!value) return { score: 0, label: '', tone: '' }
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++

  const levels = [
    { label: 'Too short', tone: 'bg-red-400', text: 'text-red-600' },
    { label: 'Weak', tone: 'bg-red-400', text: 'text-red-600' },
    { label: 'Fair', tone: 'bg-amber-400', text: 'text-amber-600' },
    { label: 'Good', tone: 'bg-brand-400', text: 'text-brand-600' },
    { label: 'Strong', tone: 'bg-emerald-500', text: 'text-emerald-600' },
  ]
  return { score, ...levels[score] }
})

const canSubmit = computed(
  () => accepted.value && email.value && password.value.length >= 8,
)

async function onSubmit() {
  if (!canSubmit.value) return
  formError.value = ''
  submitting.value = true
  try {
    const { data, error } = await signUp(email.value, password.value)
    if (error) {
      formError.value = error.message
      return
    }
    // With email confirmation disabled, Supabase signs the user straight in —
    // skip the "check your inbox" step and go to the dashboard.
    if (data?.session) {
      router.push('/portal/dashboard')
      return
    }
    sent.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="Start free"
    headline="Set up your books once. Keep them clean forever."
    subhead="Join 4,000+ finance teams who moved off spreadsheets and never looked back."
    :points="points"
  >
    <!-- Post-submit confirmation -->
    <div v-if="sent" class="text-center">
      <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" class="size-7" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="m3.5 7 8.5 6 8.5-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight text-ink">Check your inbox</h1>
      <p class="mt-3 text-[15px] leading-relaxed text-slate-500">
        We sent a confirmation link to
        <span class="font-medium text-ink">{{ email }}</span>. Click it to activate
        your workspace.
      </p>
      <RouterLink
        to="/login"
        class="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
      >
        Back to sign in
      </RouterLink>
    </div>

    <template v-else>
      <header class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p class="mt-2 text-[15px] text-slate-500">
          Already with us?
          <RouterLink
            to="/login"
            class="font-medium text-brand-600 underline-offset-4 hover:underline"
          >
            Sign in
          </RouterLink>
        </p>
      </header>

      <form class="space-y-5" novalidate @submit.prevent="onSubmit">
        <p
          v-if="formError"
          class="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <svg viewBox="0 0 24 24" class="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.2h.01" stroke-linecap="round" />
          </svg>
          {{ formError }}
        </p>

        <div class="grid gap-5 sm:grid-cols-2">
          <FormField
            v-model="fullName"
            label="Full name"
            placeholder="Ada Mensah"
            autocomplete="name"
            required
          />
          <FormField
            v-model="company"
            label="Company"
            placeholder="Northwind Ltd"
            autocomplete="organization"
          />
        </div>

        <FormField
          v-model="email"
          label="Work email"
          type="email"
          placeholder="you@company.com"
          autocomplete="email"
          required
        />

        <div>
          <FormField
            v-model="password"
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autocomplete="new-password"
            required
          />
          <div v-if="password" class="mt-2.5 flex items-center gap-3">
            <span class="flex flex-1 gap-1.5" aria-hidden="true">
              <span
                v-for="step in 4"
                :key="step"
                class="h-1 flex-1 rounded-full transition-colors"
                :class="step <= strength.score ? strength.tone : 'bg-slate-200'"
              ></span>
            </span>
            <span class="text-xs font-medium" :class="strength.text">
              {{ strength.label }}
            </span>
          </div>
        </div>

        <label class="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-600">
          <input
            v-model="accepted"
            type="checkbox"
            class="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            I agree to the
            <a href="#" class="font-medium text-brand-600 underline-offset-4 hover:underline">Terms of Service</a>
            and
            <a href="#" class="font-medium text-brand-600 underline-offset-4 hover:underline">Privacy Policy</a>.
          </span>
        </label>

        <button
          type="submit"
          :disabled="submitting || !canSubmit"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          <svg
            v-if="submitting"
            class="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
          {{ submitting ? 'Creating account…' : 'Create free account' }}
        </button>
      </form>

      <p class="mt-8 text-center text-xs text-slate-400">
        No credit card required · Cancel anytime
      </p>
    </template>
  </AuthLayout>
</template>
