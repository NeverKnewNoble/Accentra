<script setup>
import { ChevronsLeft, Landmark, X } from 'lucide-vue-next'
import { navItems } from '../../utils/samplesData'

// `open` drives the mobile drawer; `collapsed` drives the desktop icon rail.
defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'toggle-collapsed'])
</script>

<template>
  <!-- Scrim for the off-canvas drawer on small screens -->
  <div
    v-show="open"
    class="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
    @click="emit('close')"
  ></div>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-300 lg:translate-x-0"
    :class="[
      open ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'w-72 lg:w-20' : 'w-72',
    ]"
  >
    <!-- Brand row. The wordmark hides on the collapsed rail, leaving the tile. -->
    <div
      class="flex h-18 shrink-0 items-center border-b border-slate-200"
      :class="collapsed ? 'lg:justify-center lg:px-0' : 'justify-between px-5'"
    >
      <RouterLink to="/portal/dashboard" class="group flex items-center gap-2.5">
        <span
          class="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 shadow-sm transition group-hover:scale-105"
        >
          <Landmark class="size-5 text-white" :stroke-width="2" />
        </span>
        <span
          class="text-lg font-semibold tracking-tight text-ink"
          :class="collapsed ? 'lg:hidden' : ''"
        >
          Accentra
        </span>
      </RouterLink>

      <button
        type="button"
        class="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink lg:hidden"
        aria-label="Close navigation"
        @click="emit('close')"
      >
        <X class="size-5" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-5">
      <p
        class="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
        :class="collapsed ? 'lg:hidden' : ''"
      >
        Workspace
      </p>
      <ul class="space-y-1">
        <!-- `custom` lets us style the anchor from the slot, so the active
             state can drive both the row and its icon colour. -->
        <li v-for="item in navItems" :key="item.to">
          <RouterLink v-slot="{ href, isActive, navigate }" :to="item.to" custom>
            <a
              :href="href"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              :class="[
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                collapsed ? 'lg:justify-center lg:px-0' : '',
              ]"
              :aria-current="isActive ? 'page' : undefined"
              :title="collapsed ? item.label : undefined"
              @click="navigate($event), emit('close')"
            >
              <component
                :is="item.icon"
                class="size-[18px] shrink-0 transition"
                :class="isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'"
              />
              <span :class="collapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
              <span
                v-if="item.badge"
                class="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700"
                :class="collapsed ? 'lg:hidden' : ''"
              >
                {{ item.badge }}
              </span>
            </a>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Upgrade card is noise on the narrow rail, so it hides when collapsed. -->
    <div class="p-4" :class="collapsed ? 'lg:hidden' : ''">
      <div class="rounded-2xl bg-linear-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p class="text-sm font-semibold">Trial ends in 9 days</p>
        <p class="mt-1.5 text-xs leading-relaxed text-brand-100">
          Upgrade to keep automated reconciliation and unlimited invoices.
        </p>
        <button
          type="button"
          class="mt-4 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          View plans
        </button>
      </div>
    </div>

    <!-- Collapse toggle: desktop only, since mobile has the drawer close button -->
    <div class="hidden border-t border-slate-200 p-3 lg:block">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-ink"
        :class="collapsed ? 'justify-center px-0' : ''"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle-collapsed')"
      >
        <ChevronsLeft
          class="size-[18px] shrink-0 transition-transform duration-300"
          :class="collapsed ? 'rotate-180' : ''"
        />
        <span :class="collapsed ? 'hidden' : ''">Collapse</span>
      </button>
    </div>
  </aside>
</template>
