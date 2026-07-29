import { supabase } from '../lib/supabaseClient'
import { formatCurrency, percentDelta } from '../utils/format'
import { unwrap } from './helpers'

/** Queries behind /portal/reports. */

/** UI period label → an ISO date range, plus the same range a year earlier. */
export function resolvePeriod(label, today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth()

  const starts = {
    'This month': new Date(year, month, 1),
    'This quarter': new Date(year, Math.floor(month / 3) * 3, 1),
    'Year to date': new Date(year, 0, 1),
  }

  const start = starts[label] ?? starts['Year to date']
  const iso = (date) => date.toISOString().slice(0, 10)
  const shiftYear = (date, by) =>
    new Date(date.getFullYear() + by, date.getMonth(), date.getDate())

  return {
    start: iso(start),
    end: iso(today),
    priorStart: iso(shiftYear(start, -1)),
    priorEnd: iso(shiftYear(today, -1)),
  }
}

async function fetchProfitAndLoss(organizationId, start, end) {
  return (
    unwrap(
      await supabase.rpc('profit_and_loss', {
        org: organizationId,
        period_start: start,
        period_end: end,
      }),
      'profit and loss',
    ) ?? []
  )
}

/**
 * P&L table with a prior-year column. The RPC returns one period at a time, so
 * it runs twice and the two are joined here by line item — the comparison is
 * presentation, not something the database needs to know about.
 */
export async function getProfitAndLoss(organizationId, periodLabel) {
  const { start, end, priorStart, priorEnd } = resolvePeriod(periodLabel)

  const [current, prior] = await Promise.all([
    fetchProfitAndLoss(organizationId, start, end),
    fetchProfitAndLoss(organizationId, priorStart, priorEnd),
  ])

  const priorByLine = new Map(prior.map((row) => [row.line_item, Number(row.amount)]))

  return current.map((row) => {
    const previous = priorByLine.get(row.line_item) ?? 0
    const delta = percentDelta(row.amount, previous)
    return {
      line: row.line_item,
      current: formatCurrency(row.amount),
      prior: formatCurrency(previous),
      change: delta.label === '—' ? '—' : `${delta.up ? '+' : '−'}${delta.label}`,
      up: delta.up,
      emphasis: row.emphasis,
    }
  })
}

/** Revenue mix for the stacked bar. Needs invoice_items.stream populated. */
export async function getRevenueStreams(organizationId, periodLabel) {
  const { start, end } = resolvePeriod(periodLabel)

  const rows =
    unwrap(
      await supabase.rpc('revenue_by_stream', {
        org: organizationId,
        period_start: start,
        period_end: end,
      }),
      'revenue by stream',
    ) ?? []

  return rows.map((row) => ({
    label: row.label,
    amount: formatCurrency(row.amount),
    share: Number(row.share ?? 0),
  }))
}

/**
 * KPI row. Derived from the P&L rather than its own RPC, so the headline
 * figures can never disagree with the table beneath them.
 */
export async function getReportKpis(organizationId, periodLabel) {
  const { start, end, priorStart, priorEnd } = resolvePeriod(periodLabel)

  const [current, prior] = await Promise.all([
    fetchProfitAndLoss(organizationId, start, end),
    fetchProfitAndLoss(organizationId, priorStart, priorEnd),
  ])

  const pick = (rows, line) =>
    Number(rows.find((row) => row.line_item === line)?.amount ?? 0)

  const revenue = pick(current, 'Revenue')
  const priorRevenue = pick(prior, 'Revenue')
  const expenses = pick(current, 'Total expenses')
  const priorExpenses = pick(prior, 'Total expenses')
  const profit = pick(current, 'Net profit')
  const priorProfit = pick(prior, 'Net profit')

  const margin = revenue ? (profit / revenue) * 100 : 0
  const priorMargin = priorRevenue ? (priorProfit / priorRevenue) * 100 : 0

  const revenueDelta = percentDelta(revenue, priorRevenue)
  const expenseDelta = percentDelta(expenses, priorExpenses)
  const profitDelta = percentDelta(profit, priorProfit)

  return {
    revenue: formatCurrency(revenue),
    revenueDelta: revenueDelta.label,
    revenueUp: revenueDelta.up,

    margin: `${margin.toFixed(1)}%`,
    marginDelta: `${Math.abs(margin - priorMargin).toFixed(1)}pt`,
    marginUp: margin >= priorMargin,

    expenses: formatCurrency(expenses),
    expensesDelta: expenseDelta.label,
    expensesUp: expenseDelta.up,

    profit: formatCurrency(profit),
    profitDelta: profitDelta.label,
    profitUp: profitDelta.up,
    netMargin: `${margin.toFixed(1)}% net margin`,
  }
}

/** Everything the reports page needs for one period, in parallel. */
export async function getReportPageData(organizationId, periodLabel) {
  const [kpis, profitAndLoss, streams] = await Promise.all([
    getReportKpis(organizationId, periodLabel),
    getProfitAndLoss(organizationId, periodLabel),
    getRevenueStreams(organizationId, periodLabel),
  ])
  return { kpis, profitAndLoss, streams }
}
