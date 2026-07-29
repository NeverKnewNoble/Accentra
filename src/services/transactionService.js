import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, formatStatus } from '../utils/format'
import { escapeFilterValue, unwrap } from './helpers'

/** Queries behind /portal/transactions. */

/**
 * Account cards. Reads the `account_balances` view, which sums transactions
 * onto each opening balance. An "All accounts" row is prepended so the card
 * strip doubles as the filter control.
 */
export async function listAccountBalances(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('account_balances')
        .select('account_id, name, institution, type, balance, transaction_count')
        .eq('organization_id', organizationId)
        .order('balance', { ascending: false }),
      'account balances',
    ) ?? []

  const total = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0)

  return [
    {
      id: null,
      name: 'All accounts',
      balance: formatCurrency(total),
      institution: '',
      transactionCount: rows.reduce((sum, row) => sum + Number(row.transaction_count ?? 0), 0),
    },
    ...rows.map((row) => ({
      id: row.account_id,
      name: row.name,
      balance: formatCurrency(row.balance),
      institution: row.institution ?? '',
      transactionCount: row.transaction_count,
    })),
  ]
}

export async function listTransactions(organizationId, {
  accountId = null,
  filter = 'All',
  search = '',
  limit = 50,
} = {}) {
  let query = supabase
    .from('transactions')
    .select(
      `
      id, occurred_on, description, amount, status, reconciled,
      accounts (id, name),
      expense_categories (id, name)
    `,
    )
    .eq('organization_id', organizationId)
    .order('occurred_on', { ascending: false })
    .limit(limit)

  if (accountId) query = query.eq('account_id', accountId)
  if (filter === 'Money in') query = query.gt('amount', 0)
  if (filter === 'Money out') query = query.lt('amount', 0)
  if (filter === 'Uncategorised') query = query.is('category_id', null)

  const term = escapeFilterValue(search)
  if (term) query = query.ilike('description', `%${term}%`)

  const rows = unwrap(await query, 'transaction list') ?? []

  return rows.map((row) => ({
    id: row.id,
    date: formatDate(row.occurred_on),
    description: row.description,
    account: row.accounts?.name ?? '—',
    category: row.expense_categories?.name ?? 'Uncategorised',
    amount: formatCurrency(row.amount, { decimals: true }),
    positive: Number(row.amount) > 0,
    status: formatStatus(row.status),
    reconciled: row.reconciled,
  }))
}

/** Count for the reconciliation banner. `head: true` skips fetching the rows. */
export async function countUnreconciled(organizationId) {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('reconciled', false)

  if (error) throw error
  return count ?? 0
}

export async function reconcileTransaction(transactionId) {
  return unwrap(
    await supabase
      .from('transactions')
      .update({ reconciled: true, reconciled_at: new Date().toISOString(), status: 'cleared' })
      .eq('id', transactionId)
      .select()
      .single(),
    'reconciliation',
  )
}

export async function categoriseTransaction(transactionId, categoryId) {
  return unwrap(
    await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .eq('id', transactionId)
      .select()
      .single(),
    'categorisation',
  )
}

export async function createTransaction(organizationId, transaction) {
  return unwrap(
    await supabase
      .from('transactions')
      .insert({
        organization_id: organizationId,
        account_id: transaction.accountId,
        category_id: transaction.categoryId ?? null,
        occurred_on: transaction.occurredOn,
        description: transaction.description,
        amount: transaction.amount,
        status: transaction.status ?? 'cleared',
        external_ref: transaction.externalRef ?? null,
      })
      .select()
      .single(),
    'transaction creation',
  )
}

/**
 * Live feed. Realtime respects RLS, so this only ever delivers rows the caller
 * may already read — but the table must be added to the publication first:
 *   alter publication supabase_realtime add table public.transactions;
 *
 * Returns an unsubscribe function; call it in onBeforeUnmount.
 */
export function subscribeToTransactions(organizationId, onInsert) {
  const channel = supabase
    .channel(`transactions:${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `organization_id=eq.${organizationId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/** Everything the transactions page needs, fetched in parallel. */
export async function getTransactionPageData(organizationId, options = {}) {
  const [accounts, rows, unreconciled] = await Promise.all([
    listAccountBalances(organizationId),
    listTransactions(organizationId, options),
    countUnreconciled(organizationId),
  ])
  return { accounts, rows, unreconciled }
}
