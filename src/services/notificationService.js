import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/format'
import { unwrap } from './helpers'

/**
 * The notification feed.
 *
 * There is no `notifications` table, and inventing one would mean a background
 * job writing rows nobody reads. Instead the feed is *derived*: each item is a
 * live query against the state that would have triggered a notification
 * anyway. An overdue invoice that gets paid stops appearing, with nothing to
 * clean up.
 *
 * The keys match `notification_preferences.key` (§3.14), so a channel the user
 * has switched off in settings is not surfaced here either.
 */

/** Every key this module can produce, in the order the panel groups them. */
export const NOTIFICATION_KEYS = [
  'invoice-overdue',
  'expense-approval',
  'bank-sync',
  'invoice-paid',
  'monthly-close',
]

const PER_KEY_LIMIT = 5

function daysBetween(from, to) {
  return Math.floor((to - from) / 86_400_000)
}

async function overdueInvoices(organizationId, now) {
  const rows =
    unwrap(
      await supabase
        .from('invoices')
        .select('id, number, due_date, balance_due, clients (name)')
        .eq('organization_id', organizationId)
        .eq('status', 'overdue')
        .gt('balance_due', 0)
        .order('due_date', { ascending: true })
        .limit(PER_KEY_LIMIT),
      'overdue invoices',
    ) ?? []

  return rows.map((row) => {
    const late = Math.max(1, daysBetween(new Date(row.due_date), now))
    return {
      id: `invoice-overdue:${row.id}`,
      key: 'invoice-overdue',
      tone: 'danger',
      title: `${row.number} is ${late} day${late === 1 ? '' : 's'} overdue`,
      body: `${row.clients?.name ?? 'Unknown client'} still owes ${formatCurrency(
        row.balance_due,
        { decimals: true },
      )}.`,
      at: row.due_date,
      to: '/portal/invoices',
    }
  })
}

async function paidInvoices(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('invoices')
        .select('id, number, total, paid_at, clients (name)')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(PER_KEY_LIMIT),
      'paid invoices',
    ) ?? []

  return rows.map((row) => ({
    id: `invoice-paid:${row.id}`,
    key: 'invoice-paid',
    tone: 'good',
    title: `${row.clients?.name ?? 'A client'} paid ${row.number}`,
    body: `${formatCurrency(row.total, { decimals: true })} settled in full.`,
    at: row.paid_at,
    to: '/portal/invoices',
  }))
}

async function pendingExpenses(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('expenses')
        .select(
          'id, vendor, amount, created_at, profiles!expenses_submitted_by_fkey (full_name)',
        )
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(PER_KEY_LIMIT),
      'pending expenses',
    ) ?? []

  return rows.map((row) => ({
    id: `expense-approval:${row.id}`,
    key: 'expense-approval',
    tone: 'warn',
    title: `${row.profiles?.full_name ?? 'Someone'} submitted a claim`,
    body: `${formatCurrency(row.amount, { decimals: true })} to ${row.vendor}, waiting on a decision.`,
    at: row.created_at,
    to: '/portal/expenses',
  }))
}

/**
 * One item for the whole review queue rather than one per transaction — five
 * separate "this needs looking at" lines say nothing the count does not.
 */
async function transactionsNeedingReview(organizationId) {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('reconciled', false)

  if (error) throw error
  if (!count) return []

  return [
    {
      id: `bank-sync:unreconciled:${count}`,
      key: 'bank-sync',
      tone: 'warn',
      title: `${count} transaction${count === 1 ? '' : 's'} need review`,
      body: 'The period cannot be closed until these are reconciled.',
      at: new Date().toISOString(),
      to: '/portal/transactions',
    },
  ]
}

/** Derived locally — there is nothing to query, only a date to compare. */
function monthEndReminder(now) {
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = daysBetween(now, monthEnd)

  if (daysLeft > 3 || daysLeft < 0) return []

  return [
    {
      id: `monthly-close:${monthEnd.toISOString().slice(0, 10)}`,
      key: 'monthly-close',
      tone: 'info',
      title:
        daysLeft === 0
          ? 'The month closes today'
          : `Month-end close in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      body: 'Reconcile the bank and approve outstanding claims before the period ends.',
      at: monthEnd.toISOString(),
      to: '/portal/reports',
    },
  ]
}

/**
 * Build the feed.
 *
 * `mutedKeys` comes from the settings page — a preference with both channels
 * switched off means the user asked not to hear about it, and the bell is a
 * channel too.
 *
 * A source that fails is dropped rather than failing the whole feed: a
 * `viewer` cannot read some of these, and losing one section is better than an
 * empty bell.
 */
export async function listNotifications(organizationId, { mutedKeys = [] } = {}) {
  const now = new Date()

  const sources = [
    ['invoice-overdue', () => overdueInvoices(organizationId, now)],
    ['expense-approval', () => pendingExpenses(organizationId)],
    ['bank-sync', () => transactionsNeedingReview(organizationId)],
    ['invoice-paid', () => paidInvoices(organizationId)],
    ['monthly-close', () => Promise.resolve(monthEndReminder(now))],
  ].filter(([key]) => !mutedKeys.includes(key))

  const settled = await Promise.allSettled(sources.map(([, run]) => run()))

  return settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
}
