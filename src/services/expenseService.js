import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, formatStatus } from '../utils/format'
import { escapeFilterValue, unwrap } from './helpers'

/** Queries behind /portal/expenses. */

const STATUS_BY_LABEL = {
  Approved: 'approved',
  Pending: 'pending',
  Rejected: 'rejected',
  Reimbursed: 'reimbursed',
}

export async function getExpenseStats(organizationId) {
  const row = unwrap(
    await supabase.rpc('expense_stats', { org: organizationId }).single(),
    'expense stats',
  )

  return {
    spentThisMonth: formatCurrency(row.spent_this_month),
    expenseCount: row.expense_count,
    pendingAmount: formatCurrency(row.pending_amount),
    pendingCount: row.pending_count,
    reimbursable: formatCurrency(row.reimbursable),
    reimbursablePeople: row.reimbursable_people,
    topCategory: row.top_category ?? '—',
    topCategoryShare: row.top_category_share == null ? '—' : `${row.top_category_share}%`,
  }
}

/** Category meters. `share` is already a percentage from the RPC. */
export async function getExpenseBreakdown(organizationId, since = null) {
  const rows =
    unwrap(
      await supabase.rpc('expense_breakdown', { org: organizationId, since }),
      'expense breakdown',
    ) ?? []

  return rows.map((row) => ({
    id: row.category_id,
    label: row.label,
    amount: formatCurrency(row.amount),
    share: Number(row.share ?? 0),
  }))
}

/**
 * Expense table. "Reimbursable" is a boolean flag rather than a status, so it
 * filters on a different column from the other tabs.
 */
export async function listExpenses(organizationId, { filter = 'All', search = '', limit = 50 } = {}) {
  let query = supabase
    .from('expenses')
    .select(
      `
      id, vendor, spent_on, amount, method, method_detail, status, reimbursable, receipt_url,
      expense_categories (id, name),
      profiles!expenses_submitted_by_fkey (id, full_name)
    `,
    )
    .eq('organization_id', organizationId)
    .order('spent_on', { ascending: false })
    .limit(limit)

  if (filter === 'Reimbursable') {
    query = query.eq('reimbursable', true)
  } else if (STATUS_BY_LABEL[filter]) {
    query = query.eq('status', STATUS_BY_LABEL[filter])
  }

  const term = escapeFilterValue(search)
  if (term) query = query.ilike('vendor', `%${term}%`)

  const rows = unwrap(await query, 'expense list') ?? []

  return rows.map((row) => ({
    id: row.id,
    vendor: row.vendor,
    category: row.expense_categories?.name ?? 'Uncategorised',
    date: formatDate(row.spent_on),
    method: row.method_detail || METHOD_LABELS[row.method] || formatStatus(row.method),
    amount: formatCurrency(row.amount, { decimals: true }),
    status: formatStatus(row.status),
    owner: row.profiles?.full_name ?? 'Unknown',
    reimbursable: row.reimbursable,
    receiptUrl: row.receipt_url,
  }))
}

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cash: 'Cash',
  mobile_money: 'Mobile money',
  reimbursement: 'Reimbursement',
}

export async function listExpenseCategories(organizationId) {
  return (
    unwrap(
      await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .order('name'),
      'category list',
    ) ?? []
  )
}

/**
 * File a claim. `submitted_by` must be the caller — the RLS insert policy
 * checks it, so passing anyone else's id fails at the database.
 */
export async function createExpense(organizationId, userId, expense) {
  return unwrap(
    await supabase
      .from('expenses')
      .insert({
        organization_id: organizationId,
        submitted_by: userId,
        category_id: expense.categoryId ?? null,
        account_id: expense.accountId ?? null,
        vendor: expense.vendor,
        spent_on: expense.spentOn,
        amount: expense.amount,
        method: expense.method ?? 'card',
        method_detail: expense.methodDetail ?? null,
        reimbursable: expense.reimbursable ?? false,
        receipt_url: expense.receiptUrl ?? null,
        notes: expense.notes ?? null,
        status: 'pending',
      })
      .select()
      .single(),
    'expense creation',
  )
}

/** Approving requires a write role — RLS rejects it otherwise, no UI check needed. */
export async function approveExpense(expenseId, approverId) {
  return unwrap(
    await supabase
      .from('expenses')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select()
      .single(),
    'expense approval',
  )
}

export async function rejectExpense(expenseId, approverId) {
  return unwrap(
    await supabase
      .from('expenses')
      .update({
        status: 'rejected',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select()
      .single(),
    'expense rejection',
  )
}

export async function markExpenseReimbursed(expenseId) {
  return unwrap(
    await supabase
      .from('expenses')
      .update({ status: 'reimbursed' })
      .eq('id', expenseId)
      .select()
      .single(),
    'reimbursement',
  )
}

/**
 * Upload a receipt. The path must start with the organisation id — the storage
 * policy reads that first segment to decide access.
 */
export async function uploadReceipt(organizationId, expenseId, file) {
  const path = `${organizationId}/${expenseId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: false })
  if (error) throw error

  const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 3600)

  unwrap(
    await supabase.from('expenses').update({ receipt_url: path }).eq('id', expenseId),
    'receipt link',
  )

  return { path, signedUrl: data?.signedUrl }
}

/** Everything the expense page needs, fetched in parallel. */
export async function getExpensePageData(organizationId, options = {}) {
  const [stats, breakdown, rows] = await Promise.all([
    getExpenseStats(organizationId),
    getExpenseBreakdown(organizationId),
    listExpenses(organizationId, options),
  ])
  return { stats, breakdown, rows }
}
