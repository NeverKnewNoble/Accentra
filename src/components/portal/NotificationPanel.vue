<script setup>
import { computed } from 'vue'
import {
  BellOff,
  CalendarClock,
  CircleCheck,
  Receipt,
  RefreshCw,
  TriangleAlert,
} from 'lucide-vue-next'
import { useNotifications } from '../../composables/useNotifications'
import { formatRelativeDate } from '../../utils/format'

/**
 * The dropdown behind the bell.
 *
 * Items are derived from live data, so "dismiss" would be meaningless — an
 * overdue invoice stays overdue until it is paid. Reading one marks it seen and
 * takes you to the page where you can act on it, which is the only useful thing
 * to do with it.
 */
const open = defineModel('open', { type: Boolean, default: false })

const { items, loading, error, unreadCount, refresh, markRead, markAllRead, isRead } =
  useNotifications()

// Icons are presentation, so they are mapped here rather than in the service.
const ICONS = {
  'invoice-overdue': TriangleAlert,
  'invoice-paid': CircleCheck,
  'expense-approval': Receipt,
  'bank-sync': RefreshCw,
  'monthly-close': CalendarClock,
}

const TONES = {
  danger: 'bg-red-50 text-red-600',
  warn: 'bg-amber-50 text-amber-600',
  good: 'bg-emerald-50 text-emerald-600',
  info: 'bg-brand-50 text-brand-600',
}

const hasItems = computed(() => items.value.length > 0)

function onOpenItem(item) {
  markRead(item.id)
  open.value = false
}
</script>

<template>
  <div
    v-show="open"
    class="absolute right-0 mt-2 w-88 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
    role="region"
    aria-label="Notifications"
  >
    <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div>
        <p class="text-sm font-semibold text-ink">Notifications</p>
        <p class="text-xs text-slate-400">
          {{ unreadCount ? `${unreadCount} unread` : 'You are all caught up' }}
        </p>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-40"
          :disabled="loading"
          aria-label="Refresh notifications"
          @click="refresh"
        >
          <RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" />
        </button>
        <button
          v-if="unreadCount"
          type="button"
          class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
          @click="markAllRead"
        >
          Mark all read
        </button>
      </div>
    </header>

    <p v-if="loading && !hasItems" class="px-4 py-8 text-center text-sm text-slate-500">
      Checking for updates…
    </p>

    <p v-else-if="error" class="px-4 py-6 text-sm text-red-600" role="alert">
      {{ error.message }}
    </p>

    <div v-else-if="!hasItems" class="px-4 py-10 text-center">
      <span class="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <BellOff class="size-5" />
      </span>
      <p class="mt-3 text-sm font-medium text-ink">Nothing needs you</p>
      <p class="mt-1 text-sm text-slate-500">
        No overdue invoices, claims or unreviewed transactions.
      </p>
    </div>

    <ul v-else class="max-h-96 divide-y divide-slate-50 overflow-y-auto">
      <li v-for="item in items" :key="item.id">
        <RouterLink
          :to="item.to"
          class="flex gap-3 px-4 py-3.5 transition hover:bg-slate-50"
          :class="isRead(item.id) ? '' : 'bg-brand-50/40'"
          @click="onOpenItem(item)"
        >
          <span
            class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
            :class="TONES[item.tone] ?? TONES.info"
          >
            <component :is="ICONS[item.key] ?? CircleCheck" class="size-4" />
          </span>

          <span class="min-w-0 flex-1">
            <span class="flex items-start gap-2">
              <span class="min-w-0 flex-1 text-sm font-medium text-ink">
                {{ item.title }}
              </span>
              <span
                v-if="!isRead(item.id)"
                class="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600"
                aria-label="Unread"
              ></span>
            </span>
            <span class="mt-0.5 block text-sm leading-snug text-slate-500">{{ item.body }}</span>
            <span class="mt-1 block text-xs text-slate-400">
              {{ formatRelativeDate(item.at) }}
            </span>
          </span>
        </RouterLink>
      </li>
    </ul>

    <footer class="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
      <RouterLink
        to="/portal/settings"
        class="text-xs font-medium text-slate-500 transition hover:text-ink"
        @click="open = false"
      >
        Choose what you are told about
      </RouterLink>
    </footer>
  </div>
</template>
