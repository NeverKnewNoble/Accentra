import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, formatStatus } from '../utils/format'
import { escapeFilterValue, unwrap } from './helpers'
import { createTransaction, listLinkedExpenseIds } from './transactionService'

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

/** Payment methods, as the `payment_method` enum defines them. */
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'reimbursement', label: 'Reimbursement' },
]

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
 * Add a category from inside the expense form, so filing a claim never has to
 * be abandoned to go and create one. The table has a
 * `unique (organization_id, name)` constraint, so a duplicate is rejected by
 * the database rather than being silently merged.
 */
export async function createExpenseCategory(organizationId, name) {
  return unwrap(
    await supabase
      .from('expense_categories')
      .insert({ organization_id: organizationId, name: name.trim() })
      .select('id, name')
      .single(),
    'category creation',
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
        currency: expense.currency ?? 'GHS',
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
 * File a claim *and* record the money leaving the account, linked.
 *
 * An expense is a cost; a transaction is a cash movement. They are separate
 * tables because they genuinely come apart — a card settles days later, a
 * reimbursable claim has no bank line at all until it is paid back, and one
 * payment can settle several claims. But when they *are* the same event,
 * `transactions.expense_id` says so, and nothing downstream has to guess.
 *
 * `accountId` is required here: `transactions.account_id` is not nullable, and
 * money cannot leave an account nobody named.
 *
 * If the transaction fails the claim is removed again. A claim left behind
 * without its bank line would silently overstate the account balance, and the
 * caller was asking for both or neither.
 */
export async function createExpenseWithPayment(organizationId, userId, expense) {
  const created = await createExpense(organizationId, userId, expense)

  try {
    await createTransaction(organizationId, {
      accountId: expense.accountId,
      categoryId: expense.categoryId ?? null,
      expenseId: created.id,
      occurredOn: expense.spentOn,
      description: expense.vendor,
      // Money out is negative — the sign is what makes `sum(amount)` mean
      // anything.
      amount: -Math.abs(Number(expense.amount)),
      currency: expense.currency ?? 'GHS',
      status: 'cleared',
    })
  } catch (caught) {
    const { error } = await supabase.from('expenses').delete().eq('id', created.id)
    if (error) {
      throw new Error(
        `The expense was saved, but the matching bank transaction could not be recorded (${caught.message}). Add it from the transactions page so the account balance stays right.`,
      )
    }
    throw caught
  }

  return created
}

/**
 * Claims that no transaction points at yet — the match candidates in the
 * reconciliation dialog.
 *
 * Reimbursable claims are excluded: the bank line for one of those is the
 * repayment to the person, not the original purchase, and matching them here
 * would attach the wrong cash movement to the cost.
 */
export async function listUnlinkedExpenses(organizationId, { since = null } = {}) {
  const linked = await listLinkedExpenseIds(organizationId)

  const cutoff =
    since ??
    (() => {
      const date = new Date()
      date.setDate(date.getDate() - 90)
      return date.toISOString().slice(0, 10)
    })()

  const rows =
    unwrap(
      await supabase
        .from('expenses')
        .select('id, vendor, spent_on, amount, category_id, status')
        .eq('organization_id', organizationId)
        .eq('reimbursable', false)
        .gte('spent_on', cutoff)
        .order('spent_on', { ascending: false }),
      'expense list',
    ) ?? []

  return rows
    .filter((row) => !linked.has(row.id))
    .map((row) => ({
      id: row.id,
      vendor: row.vendor,
      date: formatDate(row.spent_on),
      amount: Number(row.amount),
      amountLabel: formatCurrency(row.amount, { decimals: true }),
      categoryId: row.category_id ?? '',
      status: formatStatus(row.status),
    }))
}

export async function updateExpense(expenseId, expense) {
  return unwrap(
    await supabase
      .from('expenses')
      .update({
        category_id: expense.categoryId ?? null,
        account_id: expense.accountId ?? null,
        vendor: expense.vendor,
        spent_on: expense.spentOn,
        amount: expense.amount,
        method: expense.method,
        method_detail: expense.methodDetail ?? null,
        reimbursable: expense.reimbursable ?? false,
        notes: expense.notes ?? null,
      })
      .eq('id', expenseId)
      .select()
      .single(),
    'expense update',
  )
}

export async function deleteExpense(expenseId) {
  return unwrap(
    await supabase.from('expenses').delete().eq('id', expenseId),
    'expense delete',
  )
}

/**
 * Claims with no receipt attached yet — the picker in the upload dialog. Newest
 * first, since a receipt is almost always for something just filed.
 */
export async function listExpensesMissingReceipts(organizationId, limit = 40) {
  const rows =
    unwrap(
      await supabase
        .from('expenses')
        .select('id, vendor, spent_on, amount, status')
        .eq('organization_id', organizationId)
        .is('receipt_url', null)
        .order('spent_on', { ascending: false })
        .limit(limit),
      'expense list',
    ) ?? []

  return rows.map((row) => ({
    id: row.id,
    vendor: row.vendor,
    date: formatDate(row.spent_on),
    amount: formatCurrency(row.amount, { decimals: true }),
    status: formatStatus(row.status),
  }))
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
