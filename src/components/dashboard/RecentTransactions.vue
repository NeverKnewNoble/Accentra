<script setup>
import { ArrowDownRight, ArrowUpRight } from 'lucide-vue-next'
import StatusPill from '../portal/StatusPill.vue'

defineProps({
  rows: { type: Array, default: () => [] },
})
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
      <div>
        <h2 class="text-base font-semibold text-ink">Recent transactions</h2>
        <p class="mt-1 text-sm text-slate-500">Latest activity across all accounts</p>
      </div>
      <RouterLink
        to="/portal/transactions"
        class="shrink-0 text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
      >
        View all
      </RouterLink>
    </header>

    <!-- Horizontal scroll keeps the table readable on narrow screens without
         squashing the amount column. -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-lg text-left">
        <thead>
          <tr class="border-b border-slate-100 text-xs text-slate-400">
            <th scope="col" class="px-6 py-3 font-medium">Description</th>
            <th scope="col" class="px-6 py-3 font-medium">Date</th>
            <th scope="col" class="px-6 py-3 font-medium">Status</th>
            <th scope="col" class="px-6 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-lg"
                  :class="row.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                >
                  <component :is="row.positive ? ArrowUpRight : ArrowDownRight" class="size-4" />
                </span>
                <span>
                  <span class="block text-sm font-medium text-ink">{{ row.name }}</span>
                  <span class="block text-xs text-slate-400">{{ row.category }}</span>
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm whitespace-nowrap text-slate-500">{{ row.date }}</td>
            <td class="px-6 py-4"><StatusPill :status="row.status" /></td>
            <td
              class="px-6 py-4 text-right text-sm font-semibold whitespace-nowrap tabular-nums"
              :class="row.positive ? 'text-emerald-600' : 'text-ink'"
            >
              {{ row.amount }}
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td colspan="4" class="px-6 py-14 text-center">
              <p class="text-sm font-medium text-ink">No transactions yet</p>
              <p class="mt-1 text-sm text-slate-500">
                Connect an account or record one manually to get started.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
