import { eq } from 'drizzle-orm'
import type { Db } from '~~/server/utils/db'
import { imgUrl } from '~~/server/utils/img'
import {
  invoiceSettings,
  profile,
  type InvoiceSettingsRow,
  type InvoiceRow,
  type InvoiceLineRow
} from '~~/server/db/schema'
import type {
  InvoiceSettingsDto,
  InvoiceDto,
  InvoiceLineDto,
  InvoiceListItemDto
} from '~~/shared/types/invoice'

/**
 * Read the user's invoice settings, creating a default row on first access.
 * The settings hold the running invoice-number counter, so invoice creation
 * needs a real row to bump. On first creation we seed the header (business
 * name, email, phone, logo) from the user's profile so the grower doesn't
 * retype what we already know — they can override any of it afterwards.
 */
export const getOrCreateInvoiceSettings = async (db: Db, userId: string): Promise<InvoiceSettingsRow> => {
  const existing = await db.select().from(invoiceSettings).where(eq(invoiceSettings.userId, userId)).get()
  if (existing) return existing

  const prof = await db
    .select({
      farmName: profile.farmName,
      contactEmail: profile.contactEmail,
      whatsapp: profile.whatsapp,
      avatarKey: profile.avatarKey
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .get()

  const now = new Date()
  const inserted = await db
    .insert(invoiceSettings)
    .values({
      userId,
      businessName: prof?.farmName ?? null,
      email: prof?.contactEmail ?? null,
      phone: prof?.whatsapp ?? null,
      logoKey: prof?.avatarKey ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoNothing()
    .returning()
    .get()
  if (inserted) return inserted

  // Lost the insert race (userId is the PK) — a concurrent first-access request
  // created the row first; read it back.
  const fresh = await db.select().from(invoiceSettings).where(eq(invoiceSettings.userId, userId)).get()
  return fresh!
}

export const toInvoiceSettingsDto = (row: InvoiceSettingsRow): InvoiceSettingsDto => ({
  businessName: row.businessName,
  email: row.email,
  phone: row.phone,
  address: row.address,
  vatNumber: row.vatNumber,
  bankName: row.bankName,
  accountName: row.accountName,
  accountNumber: row.accountNumber,
  sortCode: row.sortCode,
  paymentNotes: row.paymentNotes,
  taxRate: row.taxRate,
  invoicePrefix: row.invoicePrefix,
  nextInvoiceNumber: row.nextInvoiceNumber,
  numberPadding: row.numberPadding,
  paymentTermsDays: row.paymentTermsDays,
  footerNotes: row.footerNotes,
  logoUrl: row.logoKey ? imgUrl(row.logoKey) : null
})

export const toInvoiceLineDto = (row: InvoiceLineRow): InvoiceLineDto => ({
  id: row.id,
  flowerId: row.flowerId,
  description: row.description,
  quantity: row.quantity,
  unitPrice: row.unitPrice,
  amount: row.amount
})

export const toInvoiceDto = (row: InvoiceRow, lines: InvoiceLineRow[]): InvoiceDto => ({
  id: row.id,
  customerId: row.customerId,
  number: row.number,
  status: row.status as InvoiceDto['status'],
  issueDate: row.issueDate.getTime(),
  dueDate: row.dueDate ? row.dueDate.getTime() : null,
  customerName: row.customerName,
  customerEmail: row.customerEmail,
  customerPhone: row.customerPhone,
  customerAddress: row.customerAddress,
  notes: row.notes,
  taxRate: row.taxRate,
  subtotal: row.subtotal,
  taxAmount: row.taxAmount,
  total: row.total,
  lines: lines.map(toInvoiceLineDto),
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime()
})

export const toInvoiceListItemDto = (row: InvoiceRow): InvoiceListItemDto => ({
  id: row.id,
  number: row.number,
  status: row.status as InvoiceListItemDto['status'],
  customerName: row.customerName,
  issueDate: row.issueDate.getTime(),
  dueDate: row.dueDate ? row.dueDate.getTime() : null,
  total: row.total
})
