import { z } from 'zod'

/* Zod schemas for invoicing endpoints. Same conventions as the flower schemas:
   optional text trims and treats blank as null; money is integer pence; taxRate
   is basis points. Totals are NEVER read from the client — the server recomputes
   them from line quantities/unit prices. */

const MAX_TEXT = 200
const MAX_LONG_TEXT = 2000
const MAX_MONEY_PENCE = 100_000_000 // £1,000,000
const MAX_QTY = 1_000_000
const MAX_TAX_BASIS_POINTS = 10_000 // 100%

/** Optional free text: trims, blank → null, enforces a max length. */
const optionalText = (label: string, maxLen = MAX_TEXT) =>
  z
    .preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z
        .string({ error: `${label} must be text` })
        .max(maxLen, `${label} is too long (max ${maxLen})`)
        .nullish()
    )
    .transform((v) => (v == null || v === '' ? null : v))

/** Required free text: trims, must be non-empty within the max length. */
const requiredText = (label: string, maxLen = MAX_TEXT) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z
      .string({ error: `${label} is required` })
      .min(1, `${label} is required`)
      .max(maxLen, `${label} is too long (max ${maxLen})`)
  )

/** Whole number in [0, maxVal]; blank/null → fallback (0 unless given). */
const intIn = (label: string, maxVal: number, fallback = 0) =>
  z.preprocess(
    (v) => (v === '' || v == null ? fallback : v),
    z
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(0, `${label} cannot be negative`)
      .max(maxVal, `${label} is too large`)
  )

/** Epoch-ms timestamp; accepts a number or ISO/parsable date string. */
const timestamp = (label: string) =>
  z.preprocess(
    (v) => {
      if (v == null || v === '') return null
      if (typeof v === 'number') return v
      const t = Date.parse(String(v))
      return Number.isNaN(t) ? v : t
    },
    z.number({ error: `${label} must be a date` }).int()
  )

const optionalLogoKey = z
  .preprocess(
    (v) => (v === '' ? null : v),
    z
      .string()
      .refine((k) => k.startsWith('public/'), 'Invalid logo key')
      .nullish()
  )
  .transform((v) => v ?? null)

/* ── Settings ──────────────────────────────────────────────────────────────
   Upsert: every field optional with a sensible default so the form can send the
   whole object. The PUT handler merges this over the existing/default row. */
export const invoiceSettingsSchema = z.object({
  businessName: optionalText('Business name'),
  email: optionalText('Email'),
  phone: optionalText('Phone'),
  address: optionalText('Address', MAX_LONG_TEXT),
  vatNumber: optionalText('VAT number', 40),
  bankName: optionalText('Bank name'),
  accountName: optionalText('Account name'),
  accountNumber: optionalText('Account number', 40),
  sortCode: optionalText('Sort code', 20),
  paymentNotes: optionalText('Payment notes', MAX_LONG_TEXT),
  taxRate: intIn('Tax rate', MAX_TAX_BASIS_POINTS).default(0),
  invoicePrefix: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      z.string().max(12, 'Prefix is too long (max 12)').nullish()
    )
    .transform((v) => v ?? 'INV-'),
  nextInvoiceNumber: intIn('Next number', 1_000_000, 1).pipe(z.number().min(1)),
  numberPadding: intIn('Number padding', 8, 4),
  paymentTermsDays: intIn('Payment terms', 365, 14),
  footerNotes: optionalText('Footer notes', MAX_LONG_TEXT),
  logoKey: optionalLogoKey
})

/* ── Customer ──────────────────────────────────────────────────────────────*/
export const customerCreateSchema = z.object({
  name: requiredText('Customer name'),
  email: optionalText('Email'),
  phone: optionalText('Phone'),
  address: optionalText('Address', MAX_LONG_TEXT)
})

/* ── Invoice ───────────────────────────────────────────────────────────────*/
const invoiceLineSchema = z.object({
  flowerId: z.preprocess((v) => (v === '' ? null : v), z.string().nullish()).transform((v) => v ?? null),
  description: requiredText('Line description', MAX_LONG_TEXT),
  quantity: z.preprocess(
    (v) => (v === '' || v == null ? 1 : v),
    z
      .number({ error: 'Quantity must be a number' })
      .min(0, 'Quantity cannot be negative')
      .max(MAX_QTY, 'Quantity is too large')
  ),
  unitPrice: intIn('Unit price', MAX_MONEY_PENCE)
})

const invoiceBaseShape = {
  customerId: z.preprocess((v) => (v === '' ? null : v), z.string().nullish()).transform((v) => v ?? null),
  // New/edited contact fields. customerName is required (snapshot on the invoice).
  customerName: requiredText('Customer name'),
  customerEmail: optionalText('Email'),
  customerPhone: optionalText('Phone'),
  customerAddress: optionalText('Address', MAX_LONG_TEXT),
  // Save the typed contact to the reusable customer list (default true).
  saveCustomer: z.preprocess((v) => v ?? true, z.boolean()),
  status: z.enum(['draft', 'sent', 'paid']).default('draft'),
  issueDate: timestamp('Issue date'),
  dueDate: z
    .preprocess((v) => {
      if (v == null || v === '') return null
      if (typeof v === 'number') return v
      const t = Date.parse(String(v))
      return Number.isNaN(t) ? v : t
    }, z.number().int().nullable())
    .nullable(),
  notes: optionalText('Notes', MAX_LONG_TEXT),
  taxRate: intIn('Tax rate', MAX_TAX_BASIS_POINTS).default(0),
  lines: z.array(invoiceLineSchema).min(1, 'Add at least one line item'),
  // Optional explicit number; when absent the server auto-generates from settings.
  number: optionalText('Invoice number', 40)
}

export const invoiceCreateSchema = z.object(invoiceBaseShape)
export const invoicePatchSchema = z.object(invoiceBaseShape).partial()

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>
