import { supabase } from '../lib/supabaseClient'
import {
  formatCurrency,
  formatDate,
  formatPayRate,
  formatStatus,
} from '../utils/format'
import { unwrap } from './helpers'

/** Queries behind /portal/payroll. */

export async function getPayrollStats(organizationId) {
  const row = unwrap(
    await supabase.rpc('payroll_stats', { org: organizationId }).single(),
    'payroll stats',
  )

  const nextPay = row.next_pay_date ? new Date(row.next_pay_date) : null
  const daysAway = nextPay
    ? Math.max(0, Math.ceil((nextPay - new Date()) / 86_400_000))
    : null

  return {
    nextPayDate: nextPay
      ? nextPay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '—',
    daysAway: daysAway == null ? '—' : `${daysAway} days`,
    monthlyGross: formatCurrency(row.monthly_gross),
    headcount: String(row.headcount ?? 0),
    salariedCount: row.salaried_count ?? 0,
    contractCount: row.contract_count ?? 0,
    taxesDue: formatCurrency(row.taxes_due),
  }
}

/**
 * The run currently in flight, with its checklist. The four checklist steps map
 * to booleans and timestamps on `payroll_runs` — the UI renders them, it does
 * not decide them.
 */
export async function getUpcomingRun(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('payroll_runs')
        .select(
          `
          id, period_start, period_end, pay_date, status,
          gross_total, deductions_total, net_total, employee_count,
          hours_imported, gross_calculated, approved_at, submitted_at
        `,
        )
        .eq('organization_id', organizationId)
        .in('status', ['draft', 'pending'])
        .order('pay_date', { ascending: true })
        .limit(1),
      'upcoming payroll run',
    ) ?? []

  const run = rows[0]
  if (!run) return null

  return {
    id: run.id,
    period: new Date(run.period_start).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    }),
    payDate: formatDate(run.pay_date),
    gross: formatCurrency(run.gross_total, { decimals: true }),
    deductions: formatCurrency(run.deductions_total, { decimals: true }),
    net: formatCurrency(run.net_total, { decimals: true }),
    employees: run.employee_count,
    status: formatStatus(run.status),
    steps: [
      { label: 'Hours and adjustments imported', done: run.hours_imported },
      { label: 'Gross-to-net calculated', done: run.gross_calculated },
      { label: 'Manager approval', done: Boolean(run.approved_at) },
      { label: 'Payments submitted to bank', done: Boolean(run.submitted_at) },
    ],
  }
}

export async function listEmployees(organizationId, { includeInactive = false } = {}) {
  let query = supabase
    .from('employees')
    .select(
      'id, full_name, role_title, employment_type, pay_rate, started_on, status',
    )
    .eq('organization_id', organizationId)
    .order('full_name')

  if (!includeInactive) query = query.neq('status', 'left')

  const rows = unwrap(await query, 'employee list') ?? []

  return rows.map((row) => ({
    id: row.id,
    name: row.full_name,
    role: row.role_title ?? '—',
    type: formatStatus(row.employment_type),
    pay: formatPayRate(row.pay_rate, row.employment_type),
    start: new Date(row.started_on).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    }),
    status: formatStatus(row.status),
  }))
}

/**
 * Unformatted employee rows, for forms.
 *
 * `listEmployees` above returns display strings ("₵5,400 / mo"), which a number
 * input cannot bind to — the payroll dialog needs `pay_rate` as a number.
 */
export async function listEmployeesRaw(organizationId, { activeOnly = true } = {}) {
  let query = supabase
    .from('employees')
    .select(
      `
      id, full_name, role_title, email, employment_type, status, pay_rate,
      currency, started_on, ended_on, bank_account, ssnit_number, tin
    `,
    )
    .eq('organization_id', organizationId)
    .order('full_name')

  if (activeOnly) query = query.eq('status', 'active')

  return unwrap(await query, 'employee list') ?? []
}

export async function listPayrollHistory(organizationId, limit = 3) {
  const rows =
    unwrap(
      await supabase
        .from('payroll_runs')
        .select(
          'id, period_start, period_end, pay_date, gross_total, net_total, employee_count, status',
        )
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .order('pay_date', { ascending: false })
        .limit(limit),
      'payroll history',
    ) ?? []

  return rows.map((row) => ({
    id: row.id,
    period: new Date(row.period_start).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    }),
    paid: formatDate(row.pay_date),
    gross: formatCurrency(row.gross_total, { decimals: true }),
    net: formatCurrency(row.net_total, { decimals: true }),
    employees: row.employee_count,
    status: formatStatus(row.status),
  }))
}

/** Line-by-line breakdown for a single run. */
export async function getPayrollItems(runId) {
  const rows =
    unwrap(
      await supabase
        .from('payroll_items')
        .select(
          'id, gross, paye_tax, ssnit_employee, ssnit_employer, other_deductions, net, employees (id, full_name, role_title)',
        )
        .eq('payroll_run_id', runId),
      'payroll items',
    ) ?? []

  return rows.map((row) => ({
    id: row.id,
    name: row.employees?.full_name ?? 'Unknown',
    role: row.employees?.role_title ?? '—',
    gross: formatCurrency(row.gross, { decimals: true }),
    payeTax: formatCurrency(row.paye_tax, { decimals: true }),
    ssnitEmployee: formatCurrency(row.ssnit_employee, { decimals: true }),
    ssnitEmployer: formatCurrency(row.ssnit_employer, { decimals: true }),
    net: formatCurrency(row.net, { decimals: true }),
  }))
}

export async function createPayrollRun(organizationId, { periodStart, periodEnd, payDate }) {
  return unwrap(
    await supabase
      .from('payroll_runs')
      .insert({
        organization_id: organizationId,
        period_start: periodStart,
        period_end: periodEnd,
        pay_date: payDate,
        status: 'draft',
      })
      .select()
      .single(),
    'payroll run creation',
  )
}

/**
 * Insert the lines for a run.
 *
 * `net` is never sent — it is a generated column (§3.13). The
 * `payroll_items_recalc` trigger (§6.3) then rolls gross, deductions and
 * headcount back up onto the run, so those are not sent either.
 */
export async function createPayrollItems(runId, items) {
  if (!items.length) return []

  return unwrap(
    await supabase
      .from('payroll_items')
      .insert(
        items.map((item) => ({
          payroll_run_id: runId,
          employee_id: item.employeeId,
          gross: item.gross,
          paye_tax: item.payeTax,
          ssnit_employee: item.ssnitEmployee,
          ssnit_employer: item.ssnitEmployer,
          other_deductions: item.otherDeductions ?? 0,
        })),
      )
      .select(),
    'payroll item creation',
  )
}

/**
 * Create a run and its lines together.
 *
 * If the lines fail to insert, the empty run is removed rather than left behind
 * — a zero-employee draft would sit at the top of the payroll page forever, and
 * the `unique (organization_id, period_start, period_end)` constraint would
 * then block a retry for the same period.
 */
export async function createPayrollRunWithItems(organizationId, run, items) {
  const created = await createPayrollRun(organizationId, run)

  try {
    await createPayrollItems(created.id, items)
  } catch (caught) {
    await supabase.from('payroll_runs').delete().eq('id', created.id)
    throw caught
  }

  return created
}

export async function updateEmployee(employeeId, employee) {
  return unwrap(
    await supabase
      .from('employees')
      .update({
        full_name: employee.fullName,
        role_title: employee.roleTitle || null,
        email: employee.email || null,
        employment_type: employee.employmentType,
        status: employee.status,
        pay_rate: employee.payRate,
        currency: employee.currency ?? 'GHS',
        started_on: employee.startedOn,
        ended_on: employee.endedOn || null,
        bank_account: employee.bankAccount || null,
        ssnit_number: employee.ssnitNumber || null,
        tin: employee.tin || null,
      })
      .eq('id', employeeId)
      .select()
      .single(),
    'employee update',
  )
}

/** Close out a run once the bank has paid it. */
export async function markPayrollPaid(runId) {
  return unwrap(
    await supabase
      .from('payroll_runs')
      .update({ status: 'paid' })
      .eq('id', runId)
      .select()
      .single(),
    'payroll completion',
  )
}

/** Approve and submit. Only owners and admins pass the RLS write policy. */
export async function approvePayrollRun(runId, approverId) {
  return unwrap(
    await supabase
      .from('payroll_runs')
      .update({
        status: 'pending',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .select()
      .single(),
    'payroll approval',
  )
}

export const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'contract', label: 'Contract' },
]

export const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'left', label: 'Left' },
]

export async function createEmployee(organizationId, employee) {
  return unwrap(
    await supabase
      .from('employees')
      .insert({
        organization_id: organizationId,
        full_name: employee.fullName,
        role_title: employee.roleTitle || null,
        email: employee.email || null,
        employment_type: employee.employmentType ?? 'salaried',
        status: employee.status ?? 'active',
        pay_rate: employee.payRate,
        currency: employee.currency ?? 'GHS',
        started_on: employee.startedOn,
        ssnit_number: employee.ssnitNumber || null,
        tin: employee.tin || null,
        bank_account: employee.bankAccount || null,
      })
      .select()
      .single(),
    'employee creation',
  )
}

/** Everything the payroll page needs, fetched in parallel. */
export async function getPayrollPageData(organizationId) {
  const [stats, run, employees, history] = await Promise.all([
    getPayrollStats(organizationId),
    getUpcomingRun(organizationId),
    listEmployees(organizationId),
    listPayrollHistory(organizationId),
  ])
  return { stats, run, employees, history }
}
