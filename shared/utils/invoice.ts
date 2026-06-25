import type { InvoiceStatus } from '~~/shared/types/invoice'

// Shared invoice helpers used on both client and server. Totals are always
// recomputed from line quantities/unit prices — never trusted from the client.

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['draft', 'sent', 'paid'] as const

export const invoiceStatusLabel = (status: InvoiceStatus): string =>
  ({ draft: 'Draft', sent: 'Sent', paid: 'Paid' })[status] ?? status

/** A single line's amount in pence: round(quantity * unitPrice). */
export const lineAmount = (line: { quantity: number; unitPrice: number }): number =>
  Math.round((line.quantity || 0) * (line.unitPrice || 0))

/**
 * Compute invoice totals (pence) from raw lines + a basis-point tax rate.
 * subtotal = Σ line amounts; tax = round(subtotal * rate / 10000).
 */
export const invoiceTotals = (
  lines: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number
): { subtotal: number; taxAmount: number; total: number } => {
  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0)
  const taxAmount = Math.round((subtotal * (taxRate || 0)) / 10000)
  return { subtotal, taxAmount, total: subtotal + taxAmount }
}

/** Basis points → percent string for display, e.g. 2000 → "20%", 1750 → "17.5%". */
export const taxRateLabel = (basisPoints: number): string => {
  const pct = (basisPoints || 0) / 100
  // Round to 2dp but drop trailing zeros (17.5 → "17.5%", not "17.50%").
  return `${Number.isInteger(pct) ? pct : parseFloat(pct.toFixed(2))}%`
}

/** Percent (from a form input) → basis points, e.g. "20" → 2000. */
export const percentToBasisPoints = (input: string | number): number => {
  const n = Number(String(input).replace(/[%\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Format the next invoice number from a prefix + counter + zero-pad width. */
export const formatInvoiceNumber = (prefix: string, n: number, padding: number): string =>
  `${prefix}${String(n).padStart(Math.max(0, padding), '0')}`
