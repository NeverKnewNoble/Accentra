/**
 * Display formatting. The database stores numbers and snake_case enums; the UI
 * renders cedi strings and title-case labels. Every conversion between the two
 * lives here so the rules stay consistent across pages.
 */

const CEDI = '₵'

const groupedNumber = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const groupedDecimal = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * ₵248,910 by default; pass `decimals: true` for ledger rows where the pesewas
 * matter (₵1,204.55).
 */
export function formatCurrency(value, { decimals = false, signed = false } = {}) {
  const amount = Number(value ?? 0)
  const formatter = decimals ? groupedDecimal : groupedNumber
  const body = `${CEDI}${formatter.format(Math.abs(amount))}`

  if (!signed) return amount < 0 ? `−${body}` : body
  return amount < 0 ? `− ${body}` : `+ ${body}`
}

/** Compact form for stat tiles: ₵2.8M, ₵412.9K. */
export function formatCompactCurrency(value) {
  const amount = Number(value ?? 0)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${CEDI}${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 100_000) return `${CEDI}${(amount / 1_000).toFixed(1)}K`
  return formatCurrency(amount)
}

/** 12 Jul 2026 */
export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** "Today, 09:14", "Yesterday", "4 days ago", then falls back to a date. */
export function formatRelativeDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  )

  if (days === 0) {
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    // A date column carries no time, so only show one when there is one.
    return time === '00:00' ? 'Today' : `Today, ${time}`
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(value)
}

/** 'needs_review' → 'Needs review'. Matches the StatusPill vocabulary. */
export function formatStatus(value) {
  if (!value) return '—'
  const text = String(value).replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Percentage change between two periods, as a signed display string. */
export function percentDelta(current, previous) {
  const now = Number(current ?? 0)
  const before = Number(previous ?? 0)
  if (!before) return { label: '—', up: true }
  const change = ((now - before) / Math.abs(before)) * 100
  return { label: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 }
}

/** Initials for avatar tiles. "Ada Mensah" → "AM". */
export function initials(name) {
  if (!name) return '—'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/** Monthly salary or hourly rate, depending on employment type. */
export function formatPayRate(rate, employmentType) {
  const amount = formatCurrency(rate, { decimals: false })
  return employmentType === 'contract' ? `${amount} / hr` : `${amount} / mo`
}
