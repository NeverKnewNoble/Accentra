<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings } from 'lucide-vue-next'

const props = defineProps({
  email: { type: String, default: '' },
})
const emit = defineEmits(['toggle-sidebar', 'sign-out'])

const menuOpen = ref(false)
const menuRoot = ref(null)

// Derive a display name and initials from the email until we store profiles.
const handle = computed(() => props.email.split('@')[0] || 'there')
const displayName = computed(() =>
  handle.value
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
)
const initials = computed(
  () =>
    displayName.value
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'A',
)

function onDocumentClick(event) {
  if (menuRoot.value && !menuRoot.value.contains(event.target)) menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-18 items-center gap-4 border-b border-slate-200 bg-white/85 px-5 backdrop-blur-xl sm:px-8"
  >
    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink lg:hidden"
      aria-label="Open navigation"
      @click="emit('toggle-sidebar')"
    >
      <Menu class="size-5" />
    </button>

    <div class="relative hidden max-w-sm flex-1 sm:block">
      <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="Search invoices, contacts, entries…"
        aria-label="Search"
        class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-ink transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:outline-none"
      />
    </div>

    <div class="ml-auto flex items-center gap-2">
      <button
        type="button"
        class="hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98] sm:inline-flex"
      >
        <Plus class="size-4" />
        New invoice
      </button>

      <button
        type="button"
        class="relative grid size-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell class="size-5" />
        <span class="absolute top-2 right-2.5 size-2 rounded-full bg-brand-600 ring-2 ring-white"></span>
      </button>

      <div ref="menuRoot" class="relative">
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5 transition hover:bg-slate-100"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          @click="menuOpen = !menuOpen"
        >
          <span
            class="grid size-9 place-items-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white"
          >
            {{ initials }}
          </span>
          <span class="hidden text-left sm:block">
            <span class="block text-sm font-medium text-ink">{{ displayName }}</span>
            <span class="block max-w-40 truncate text-xs text-slate-400">{{ email }}</span>
          </span>
          <ChevronDown class="size-4 text-slate-400 transition" :class="menuOpen ? 'rotate-180' : ''" />
        </button>

        <div
          v-show="menuOpen"
          role="menu"
          class="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
        >
          <div class="border-b border-slate-100 px-4 py-3">
            <p class="text-sm font-medium text-ink">{{ displayName }}</p>
            <p class="truncate text-xs text-slate-400">{{ email }}</p>
          </div>
          <RouterLink
            to="/portal/settings"
            role="menuitem"
            class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
            @click="menuOpen = false"
          >
            <Settings class="size-4 text-slate-400" />
            Account settings
          </RouterLink>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            @click="menuOpen = false; emit('sign-out')"
          >
            <LogOut class="size-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
