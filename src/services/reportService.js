import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, formatStatus, percentDelta } from '../utils/format'
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

/* --------------------------------------------------- generated statements */

/**
 * Why a report in the library cannot be produced from this schema.
 *
 * Saying so is the point. A balance sheet built without a chart of accounts
 * would be a guess dressed as a filing, and the person reading it has no way
 * to tell.
 */
const UNAVAILABLE = {
  'balance-sheet':
    'A balance sheet needs a chart of accounts and double-entry postings. This schema tracks transactions, invoices and expenses, but not assets, liabilities or equity.',
  'trial-balance':
    'A trial balance lists debits and credits per ledger account. There is no general ledger in this schema — transactions post against bank accounts, not nominal codes.',
  'vat-return':
    'Output VAT is available from invoice tax totals, but expenses carry no VAT column, so input VAT cannot be computed. A return with only one side of it would be wrong to file.',
}

export function reportUnavailableReason(kind) {
  return UNAVAILABLE[kind] ?? null
}

/** Profit and loss for an explicit range, as export-ready rows. */
async function buildProfitAndLoss(organizationId, start, end) {
  const rows = await fetchProfitAndLoss(organizationId, start, end)

  return {
    columns: [
      { key: 'line', label: 'Line item' },
      { key: 'amount', label: 'Amount' },
    ],
    rows: rows.map((row) => ({
      line: row.line_item,
      amount: formatCurrency(row.amount, { decimals: true }),
      emphasis: row.emphasis,
    })),
  }
}

/**
 * Money in and out per month across the range.
 *
 * Aggregated here rather than through `cash_flow_by_month`, which counts back
 * a number of months from today and so cannot answer a historic range.
 */
async function buildCashFlow(organizationId, start, end) {
  const rows =
    unwrap(
      await supabase
        .from('transactions')
        .select('occurred_on, amount')
        .eq('organization_id', organizationId)
        .neq('status', 'failed')
        .gte('occurred_on', start)
        .lte('occurred_on', end)
        .order('occurred_on'),
      'cash flow statement',
    ) ?? []

  const byMonth = new Map()

  for (const row of rows) {
    const key = String(row.occurred_on).slice(0, 7)
    const bucket = byMonth.get(key) ?? { inflow: 0, outflow: 0 }
    const amount = Number(row.amount)
    if (amount > 0) bucket.inflow += amount
    else bucket.outflow += Math.abs(amount)
    byMonth.set(key, bucket)
  }

  return {
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'inflow', label: 'Money in' },
      { key: 'outflow', label: 'Money out' },
      { key: 'net', label: 'Net movement' },
    ],
    rows: [...byMonth.entries()].map(([month, bucket]) => ({
      month: new Date(`${month}-01`).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
      inflow: formatCurrency(bucket.inflow, { decimals: true }),
      outflow: formatCurrency(bucket.outflow, { decimals: true }),
      net: formatCurrency(bucket.inflow - bucket.outflow, { decimals: true }),
    })),
  }
}

const AGEING_BUCKETS = [
  { label: 'Not yet due', max: 0 },
  { label: '1–30 days', max: 30 },
  { label: '31–60 days', max: 60 },
  { label: '61–90 days', max: 90 },
  { label: 'Over 90 days', max: Infinity },
]

function ageingBucket(dueDate, asAt) {
  const daysLate = Math.floor((asAt - new Date(dueDate)) / 86_400_000)
  if (daysLate <= 0) return AGEING_BUCKETS[0].label
  return AGEING_BUCKETS.find((bucket) => daysLate <= bucket.max).label
}

/** Unpaid invoices, bucketed by how far past their due date they are. */
async function buildAgedReceivables(organizationId, _start, end) {
  const rows =
    unwrap(
      await supabase
        .from('invoices')
        .select('number, due_date, balance_due, status, clients (name)')
        .eq('organization_id', organizationId)
        .in('status', ['sent', 'overdue'])
        .gt('balance_due', 0)
        .order('due_date'),
      'aged receivables',
    ) ?? []

  const asAt = new Date(end)

  return {
    columns: [
      { key: 'client', label: 'Client' },
      { key: 'number', label: 'Invoice' },
      { key: 'due', label: 'Due' },
      { key: 'bucket', label: 'Age' },
      { key: 'balance', label: 'Balance due' },
    ],
    rows: rows.map((row) => ({
      client: row.clients?.name ?? 'Unknown client',
      number: row.number,
      due: formatDate(row.due_date),
      bucket: ageingBucket(row.due_date, asAt),
      balance: formatCurrency(row.balance_due, { decimals: true }),
    })),
  }
}

/** Every pay run whose pay date falls inside the range. */
async function buildPayrollSummary(organizationId, start, end) {
  const rows =
    unwrap(
      await supabase
        .from('payroll_runs')
        .select(
          'period_start, period_end, pay_date, status, gross_total, deductions_total, net_total, employee_count',
        )
        .eq('organization_id', organizationId)
        .gte('pay_date', start)
        .lte('pay_date', end)
        .order('pay_date', { ascending: false }),
      'payroll summary',
    ) ?? []

  return {
    columns: [
      { key: 'period', label: 'Period' },
      { key: 'payDate', label: 'Pay date' },
      { key: 'status', label: 'Status' },
      { key: 'employees', label: 'People' },
      { key: 'gross', label: 'Gross' },
      { key: 'deductions', label: 'Deductions' },
      { key: 'net', label: 'Net paid' },
    ],
    rows: rows.map((row) => ({
      period: `${formatDate(row.period_start)} – ${formatDate(row.period_end)}`,
      payDate: formatDate(row.pay_date),
      status: formatStatus(row.status),
      employees: row.employee_count,
      gross: formatCurrency(row.gross_total, { decimals: true }),
      deductions: formatCurrency(row.deductions_total, { decimals: true }),
      net: formatCurrency(row.net_total, { decimals: true }),
    })),
  }
}

const BUILDERS = {
  'profit-and-loss': buildProfitAndLoss,
  'cash-flow': buildCashFlow,
  'aged-receivables': buildAgedReceivables,
  'payroll-summary': buildPayrollSummary,
}

/**
 * Build one report over an explicit date range.
 *
 * Returns `{ columns, rows }` — the same shape the export helper takes, so the
 * dialog renders and downloads the identical figures.
 */
export async function generateReport(organizationId, kind, { start, end }) {
  const reason = reportUnavailableReason(kind)
  if (reason) throw new Error(reason)

  const build = BUILDERS[kind]
  if (!build) throw new Error(`No report is defined for "${kind}".`)

  return build(organizationId, start, end)
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
