import { supabase } from '../lib/supabaseClient'
import { unwrap } from './helpers'

/**
 * Which organisation is the signed-in user working in, and what may they do
 * inside it. Every other service takes the id this returns.
 */

/**
 * Memberships for the current user, newest organisation last. RLS already
 * limits this to rows the caller belongs to.
 */
export async function listMemberships() {
  const rows = unwrap(
    await supabase
      .from('organization_members')
      .select(
        `
        organization_id,
        role,
        organizations (
          id, name, registration_number, vat_number, address,
          base_currency, fiscal_year_start, accounting_basis
        )
      `,
      )
      .order('created_at', { ascending: true }),
    'membership lookup',
  )

  return (rows ?? []).map((row) => ({
    organizationId: row.organization_id,
    role: row.role,
    organization: row.organizations,
  }))
}

/**
 * The organisation to open the portal in. Users belong to exactly one today,
 * so the first membership wins; add a switcher here when that changes.
 */
export async function getCurrentOrganization() {
  const memberships = await listMemberships()
  if (!memberships.length) {
    throw new Error(
      'Your account is not attached to an organisation yet. The signup trigger in supabase_schema.md §4.4 creates one.',
    )
  }
  return memberships[0]
}

export async function getOrganization(organizationId) {
  return unwrap(
    await supabase
      .from('organizations')
      .select(
        'id, name, registration_number, vat_number, address, base_currency, fiscal_year_start, accounting_basis',
      )
      .eq('id', organizationId)
      .single(),
    'organisation lookup',
  )
}

export async function updateOrganization(organizationId, patch) {
  return unwrap(
    await supabase
      .from('organizations')
      .update({
        name: patch.name,
        registration_number: patch.registrationNumber,
        vat_number: patch.vatNumber,
        address: patch.address,
        base_currency: patch.baseCurrency,
        fiscal_year_start: patch.fiscalYearStart,
        accounting_basis: patch.accountingBasis,
      })
      .eq('id', organizationId)
      .select()
      .single(),
    'organisation update',
  )
}

/** Roles that may approve expenses and edit ledger records. */
export const WRITE_ROLES = ['owner', 'admin', 'bookkeeper']

export function canWrite(role) {
  return WRITE_ROLES.includes(role)
}

export function canManagePayroll(role) {
  return ['owner', 'admin'].includes(role)
}
