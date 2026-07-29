import { supabase } from '../lib/supabaseClient'
import {
  formatCurrency,
  formatRelativeDate,
  formatStatus,
  percentDelta,
} from '../utils/format'
import { unwrap } from './helpers'

/** Queries behind /portal/dashboard. */

/**
 * Stat row. The RPC returns raw numbers for this month and last; the deltas
 * are derived here so the tiles stay a dumb render.
 */
export async function getDashboardStats(organizationId) {
  const row = unwrap(
    await supabase.rpc('dashboard_stats', { org: organizationId }).single(),
    'dashboard stats',
  )

  const revenue = percentDelta(row.revenue_this_month, row.revenue_last_month)
  const expenses = percentDelta(row.expenses_this_month, row.expenses_last_month)

  return {
    netCash: formatCurrency(row.net_cash),
    accountCount: row.account_count,

    revenue: formatCurrency(row.revenue_this_month),
    revenueLastMonth: formatCurrency(row.revenue_last_month),
    revenueDelta: revenue.label,
    revenueUp: revenue.up,

    expenses: formatCurrency(row.expenses_this_month),
    expensesDelta: expenses.label,
    expensesUp: expenses.up,

    outstanding: formatCurrency(row.outstanding_invoices),
    unpaidCount: row.unpaid_count,
    overdueCount: row.overdue_count,
  }
}

/**
 * Cash-flow bars. Heights are normalised to 0–100 here because the chart is
 * pure CSS — it has no scale of its own.
 */
export async function getCashFlow(organizationId, months = 8) {
  const rows =
    unwrap(
      await supabase.rpc('cash_flow_by_month', { org: organizationId, months }),
      'cash flow',
    ) ?? []

  const peak = Math.max(
    1,
    ...rows.flatMap((row) => [Number(row.inflow), Number(row.outflow)]),
  )

  return rows.map((row) => ({
    label: row.label,
    monthStart: row.month_start,
    inflow: Math.round((Number(row.inflow) / peak) * 100),
    outflow: Math.round((Number(row.outflow) / peak) * 100),
    inflowAmount: formatCurrency(row.inflow),
    outflowAmount: formatCurrency(row.outflow),
  }))
}

/** Invoice status buckets for the stacked bar and its legend. */
export async function getInvoiceBuckets(organizationId) {
  const rows =
    unwrap(
      await supabase.rpc('invoice_buckets', { org: organizationId }),
      'invoice buckets',
    ) ?? []

  const LABELS = { paid: 'Paid', sent: 'Awaiting payment', overdue: 'Overdue' }

  return rows.map((row) => ({
    label: LABELS[row.status] ?? formatStatus(row.status),
    status: formatStatus(row.status),
    amount: formatCurrency(row.amount),
    count: row.count,
    share: Number(row.share ?? 0),
  }))
}

/** Five most recent movements for the activity table. */
export async function getRecentTransactions(organizationId, limit = 5) {
  const rows =
    unwrap(
      await supabase
        .from('transactions')
        .select(
          'id, description, occurred_on, amount, status, expense_categories(name)',
        )
        .eq('organization_id', organizationId)
        .order('occurred_on', { ascending: false })
        .limit(limit),
      'recent transactions',
    ) ?? []

  return rows.map((row) => ({
    id: row.id,
    name: row.description,
    category: row.expense_categories?.name ?? 'Uncategorised',
    date: formatRelativeDate(row.occurred_on),
    amount: formatCurrency(row.amount, { decimals: true, signed: true }),
    positive: Number(row.amount) > 0,
    status: formatStatus(row.status),
  }))
}

/** Everything the dashboard needs, in one round trip of parallel requests. */
export async function getDashboardData(organizationId) {
  const [stats, cashFlow, buckets, recent] = await Promise.all([
    getDashboardStats(organizationId),
    getCashFlow(organizationId),
    getInvoiceBuckets(organizationId),
    getRecentTransactions(organizationId),
  ])
  return { stats, cashFlow, buckets, recent }
}
