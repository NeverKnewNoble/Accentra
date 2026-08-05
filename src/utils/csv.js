/**
 * CSV export. The portal has no server-side report renderer, so the export
 * buttons build the file from the rows already on screen and hand it to the
 * browser.
 */

/**
 * Quote a single cell. Commas, quotes and newlines are all CSV syntax, so any
 * value containing one has to be wrapped and its quotes doubled.
 *
 * A leading `=`, `+`, `-` or `@` makes Excel treat the cell as a formula, so
 * those are prefixed with a tab — the value still reads correctly, but it can
 * never execute.
 */
function escapeCell(value) {
  if (value == null) return ''

  let text = String(value)
  if (/^[=+\-@]/.test(text)) text = `\t${text}`

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Build a CSV string.
 *
 * `columns` is `[{ key, label }]` — the order here is the column order in the
 * file, and `label` is the header row.
 */
export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label ?? column.key))
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(row[column.key])).join(','),
  )
  return [header.join(','), ...body].join('\r\n')
}

/** Trigger a download of `rows` as `filename`. */
export function downloadCsv(filename, rows, columns) {
  // The BOM makes Excel open UTF-8 correctly — without it the cedi sign
  // arrives as mojibake.
  const blob = new Blob([`﻿${toCsv(rows, columns)}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** `invoices-2026-08-05.csv` */
export function timestampedName(base) {
  return `${base}-${new Date().toISOString().slice(0, 10)}.csv`
}
