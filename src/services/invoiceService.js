import { supabase } from '../lib/supabaseClient'
import { formatCurrency, formatDate, formatStatus } from '../utils/format'
import { escapeFilterValue, pageRange, unwrap } from './helpers'

/** Queries behind /portal/invoices. */

/** UI filter label → database enum value. 'All' means no status filter. */
const STATUS_BY_LABEL = {
  Draft: 'draft',
  Sent: 'sent',
  Paid: 'paid',
  Overdue: 'overdue',
}

export async function getInvoiceStats(organizationId) {
  const row = unwrap(
    await supabase.rpc('invoice_stats', { org: organizationId }).single(),
    'invoice stats',
  )

  return {
    outstanding: formatCurrency(row.outstanding),
    unpaidCount: row.unpaid_count,
    overdue: formatCurrency(row.overdue),
    overdueCount: row.overdue_count,
    paidThisMonth: formatCurrency(row.paid_this_month),
    paidCount: row.paid_count,
    avgDaysToPay: row.avg_days_to_pay == null ? '—' : `${row.avg_days_to_pay} days`,
  }
}

/**
 * Paginated invoice table.
 *
 * Search covers the invoice number and the client name. The client name lives
 * on a joined table, so it needs its own filter rather than an `or()` — the
 * embedded-resource syntax cannot be mixed into a top-level `or`.
 */
export async function listInvoices(organizationId, {
  filter = 'All',
  search = '',
  page = 0,
  pageSize = 20,
} = {}) {
  const [from, to] = pageRange(page, pageSize)

  let query = supabase
    .from('invoices')
    .select(
      'id, number, status, issue_date, due_date, total, balance_due, clients!inner(id, name, email)',
      { count: 'exact' },
    )
    .eq('organization_id', organizationId)
    .order('issue_date', { ascending: false })
    .range(from, to)

  const status = STATUS_BY_LABEL[filter]
  if (status) query = query.eq('status', status)

  const term = escapeFilterValue(search)
  if (term) {
    // Two passes would be needed to OR across the join, so match the number
    // first and fall back to the client name when it finds nothing.
    query = query.or(`number.ilike.%${term}%`)
  }

  const { data, count } = unwrap(await query, 'invoice list')

  let rows = data ?? []

  // Second pass: if a number search found nothing, try the client name.
  if (term && !rows.length) {
    const byClient = unwrap(
      await supabase
        .from('invoices')
        .select(
          'id, number, status, issue_date, due_date, total, balance_due, clients!inner(id, name, email)',
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .ilike('clients.name', `%${term}%`)
        .order('issue_date', { ascending: false })
        .range(from, to),
      'invoice list',
    )
    rows = byClient.data ?? []
    return { rows: rows.map(toInvoiceRow), total: byClient.count ?? rows.length }
  }

  return { rows: rows.map(toInvoiceRow), total: count ?? rows.length }
}

function toInvoiceRow(row) {
  return {
    id: row.id,
    number: row.number,
    client: row.clients?.name ?? 'Unknown client',
    email: row.clients?.email ?? '',
    issued: formatDate(row.issue_date),
    due: formatDate(row.due_date),
    amount: formatCurrency(row.total, { decimals: true }),
    balanceDue: formatCurrency(row.balance_due, { decimals: true }),
    status: formatStatus(row.status),
  }
}

/** Full invoice with its line items, for a detail view or PDF export. */
export async function getInvoice(invoiceId) {
  return unwrap(
    await supabase
      .from('invoices')
      .select(
        `
        *,
        clients (id, name, email, address, payment_terms),
        invoice_items (id, description, quantity, unit_price, tax_rate, line_total, position)
      `,
      )
      .eq('id', invoiceId)
      .order('position', { referencedTable: 'invoice_items', ascending: true })
      .single(),
    'invoice lookup',
  )
}

/**
 * Create an invoice and its lines. Totals are not passed — the
 * `invoice_items_recalc` trigger computes subtotal, tax and total from the
 * lines, so there is exactly one place that arithmetic can be wrong.
 */
export async function createInvoice(organizationId, { clientId, number, issueDate, dueDate, notes, lines = [] }) {
  const invoice = unwrap(
    await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        number,
        issue_date: issueDate,
        due_date: dueDate,
        notes,
        status: 'draft',
      })
      .select()
      .single(),
    'invoice creation',
  )

  if (lines.length) {
    unwrap(
      await supabase.from('invoice_items').insert(
        lines.map((line, index) => ({
          invoice_id: invoice.id,
          description: line.description,
          quantity: line.quantity ?? 1,
          unit_price: line.unitPrice ?? 0,
          tax_rate: line.taxRate ?? 15, // Ghana standard VAT
          position: index,
        })),
      ),
      'invoice line creation',
    )
  }

  return invoice
}

export async function updateInvoiceStatus(invoiceId, status) {
  const patch = { status }
  if (status === 'sent') patch.sent_at = new Date().toISOString()
  if (status === 'paid') patch.paid_at = new Date().toISOString()

  return unwrap(
    await supabase.from('invoices').update(patch).eq('id', invoiceId).select().single(),
    'invoice update',
  )
}

/** Record a payment. `amount_paid` drives the generated `balance_due` column. */
export async function recordInvoicePayment(invoiceId, amountPaid, { markPaid = true } = {}) {
  const patch = { amount_paid: amountPaid }
  if (markPaid) {
    patch.status = 'paid'
    patch.paid_at = new Date().toISOString()
  }
  return unwrap(
    await supabase.from('invoices').update(patch).eq('id', invoiceId).select().single(),
    'payment record',
  )
}

export async function deleteInvoice(invoiceId) {
  return unwrap(
    await supabase.from('invoices').delete().eq('id', invoiceId),
    'invoice delete',
  )
}

/** Next number in sequence, e.g. INV-2206. Used to prefill the new-invoice form. */
export async function getNextInvoiceNumber(organizationId, prefix = 'INV-') {
  const rows =
    unwrap(
      await supabase
        .from('invoices')
        .select('number')
        .eq('organization_id', organizationId)
        .like('number', `${prefix}%`)
        .order('number', { ascending: false })
        .limit(1),
      'invoice numbering',
    ) ?? []

  const last = rows[0]?.number
  const sequence = last ? Number(last.replace(prefix, '')) : 2200
  return `${prefix}${Number.isFinite(sequence) ? sequence + 1 : 2201}`
}

/* ------------------------------------------------------------------ clients */

export async function listClients(organizationId) {
  const rows =
    unwrap(
      await supabase
        .from('clients')
        .select('id, name, email, phone, payment_terms')
        .eq('organization_id', organizationId)
        .is('archived_at', null)
        .order('name'),
      'client list',
    ) ?? []
  return rows
}

export async function createClient(organizationId, client) {
  return unwrap(
    await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        payment_terms: client.paymentTerms ?? 14,
      })
      .select()
      .single(),
    'client creation',
  )
}
