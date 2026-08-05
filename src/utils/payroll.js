/**
 * Ghana gross-to-net arithmetic.
 *
 * These are *defaults*. Every figure the run dialog produces stays editable
 * before it is saved, because real payroll has allowances, reliefs and
 * one-off adjustments this cannot know about. Treat the output as a starting
 * point, not an authority — confirm against current GRA guidance before filing.
 */

/** Employee contribution to SSNIT (Tier 1 + 2), deducted from gross. */
export const SSNIT_EMPLOYEE_RATE = 0.055

/** Employer contribution. Not deducted from the employee — a cost on top. */
export const SSNIT_EMPLOYER_RATE = 0.13

/**
 * Monthly PAYE bands: `[width of band, rate]`, applied to chargeable income in
 * order. The final band has no ceiling.
 */
const PAYE_BANDS = [
  [490, 0],
  [110, 0.05],
  [130, 0.1],
  [3166.67, 0.175],
  [16000, 0.25],
  [30520, 0.3],
  [Infinity, 0.35],
]

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

/**
 * PAYE on a month's chargeable income — that is, gross *after* the SSNIT
 * employee deduction, which is relieved before tax.
 */
export function calculatePaye(chargeableIncome) {
  let remaining = Math.max(0, Number(chargeableIncome) || 0)
  let tax = 0

  for (const [width, rate] of PAYE_BANDS) {
    if (remaining <= 0) break
    const taxable = Math.min(remaining, width)
    tax += taxable * rate
    remaining -= taxable
  }

  return round2(tax)
}

/**
 * A full payroll line from a gross figure.
 *
 * `net` is not returned — the column is `generated always` in Postgres
 * (§3.13), so sending it would be rejected. It is shown in the dialog from
 * `previewNet` below and computed for real by the database.
 */
export function grossToNet(gross, { otherDeductions = 0 } = {}) {
  const amount = Math.max(0, Number(gross) || 0)
  const ssnitEmployee = round2(amount * SSNIT_EMPLOYEE_RATE)
  const ssnitEmployer = round2(amount * SSNIT_EMPLOYER_RATE)
  const payeTax = calculatePaye(amount - ssnitEmployee)

  return {
    gross: round2(amount),
    payeTax,
    ssnitEmployee,
    ssnitEmployer,
    otherDeductions: round2(otherDeductions),
  }
}

/** What Postgres will compute for `net`, so the dialog can show it live. */
export function previewNet({ gross, payeTax, ssnitEmployee, otherDeductions }) {
  return round2(
    (Number(gross) || 0) -
      (Number(payeTax) || 0) -
      (Number(ssnitEmployee) || 0) -
      (Number(otherDeductions) || 0),
  )
}

/** First and last day of the month a date falls in, as ISO date strings. */
export function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const iso = (value) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate(),
    ).padStart(2, '0')}`

  return { start: iso(start), end: iso(end) }
}
