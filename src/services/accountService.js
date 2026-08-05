import { supabase } from '../lib/supabaseClient'
import { unwrap } from './helpers'

/**
 * The `accounts` table.
 *
 * Separate from transactionService because accounts are their own thing —
 * transactionService reads the `account_balances` view for display, this writes
 * the underlying rows.
 */

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank account' },
  { value: 'card', label: 'Credit or debit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'savings', label: 'Savings' },
]

/** Raw rows for form selects — no formatting, unlike `listAccountBalances`. */
export async function listAccounts(organizationId, { includeArchived = false } = {}) {
  let query = supabase
    .from('accounts')
    .select('id, name, institution, type, currency, opening_balance, archived_at')
    .eq('organization_id', organizationId)
    .order('name')

  if (!includeArchived) query = query.is('archived_at', null)

  return unwrap(await query, 'account list') ?? []
}

export async function createAccount(organizationId, account) {
  return unwrap(
    await supabase
      .from('accounts')
      .insert({
        organization_id: organizationId,
        name: account.name,
        institution: account.institution || null,
        type: account.type ?? 'bank',
        currency: account.currency ?? 'GHS',
        opening_balance: Number(account.openingBalance ?? 0),
      })
      .select()
      .single(),
    'account creation',
  )
}

export async function updateAccount(accountId, patch) {
  return unwrap(
    await supabase
      .from('accounts')
      .update({
        name: patch.name,
        institution: patch.institution || null,
        type: patch.type,
        currency: patch.currency,
        opening_balance: Number(patch.openingBalance ?? 0),
      })
      .eq('id', accountId)
      .select()
      .single(),
    'account update',
  )
}

/** Soft delete — ledger history has to survive, so nothing is ever removed. */
export async function archiveAccount(accountId) {
  return unwrap(
    await supabase
      .from('accounts')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single(),
    'account archive',
  )
}
