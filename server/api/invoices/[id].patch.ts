import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam, readZodBody } from '~~/server/utils/validation'
import { invoicePatchSchema } from '~~/server/utils/invoiceSchemas'
import { toInvoiceDto } from '~~/server/utils/invoice'
import { resolveCustomerId, buildInvoiceLineRows } from './index.post'
import { invoice, invoiceLine, type InvoiceRow } from '~~/server/db/schema'
import { invoiceTotals } from '~~/shared/utils/invoice'
import type { InvoiceDto } from '~~/shared/types/invoice'

/**
 * PATCH /api/invoices/[id] — partial update. Only the keys present in the body
 * are touched (`invoicePatchSchema` is `.partial()`). Sending just `status`
 * cheaply handles the mark-as-sent/paid quick action; sending the full object
 * (incl. `lines`) re-saves the whole invoice. Totals are always recomputed when
 * lines or the tax rate change. `updatedAt` always bumps.
 */
export default defineEventHandler(async (event): Promise<InvoiceDto> => {
  const user = await requireUser(event)
  const db = useDb(event)
  const id = getSafeRouterParam(event, 'id')

  const existing = await db.select().from(invoice).where(eq(invoice.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  if (existing.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Not your invoice' })

  const body = await readZodBody(event, invoicePatchSchema)

  const patch: Partial<InvoiceRow> = { updatedAt: new Date() }

  if (body.number !== undefined) patch.number = body.number ?? existing.number
  if (body.status !== undefined) patch.status = body.status
  if (body.issueDate !== undefined) patch.issueDate = new Date(body.issueDate)
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate != null ? new Date(body.dueDate) : null
  if (body.notes !== undefined) patch.notes = body.notes
  if (body.customerName !== undefined) patch.customerName = body.customerName
  if (body.customerEmail !== undefined) patch.customerEmail = body.customerEmail
  if (body.customerPhone !== undefined) patch.customerPhone = body.customerPhone
  if (body.customerAddress !== undefined) patch.customerAddress = body.customerAddress
  if (body.taxRate !== undefined) patch.taxRate = body.taxRate

  // Re-link / re-save the customer when contact fields are part of this update.
  if (body.customerName !== undefined || body.customerId !== undefined) {
    patch.customerId = await resolveCustomerId(db, user.id, {
      customerId: body.customerId ?? null,
      customerName: body.customerName ?? existing.customerName,
      customerEmail: body.customerEmail ?? existing.customerEmail,
      customerPhone: body.customerPhone ?? existing.customerPhone,
      customerAddress: body.customerAddress ?? existing.customerAddress,
      saveCustomer: body.saveCustomer
    })
  }

  // Recompute totals when the lines or tax rate change.
  const effectiveTaxRate = body.taxRate ?? existing.taxRate
  let newLineRows: ReturnType<typeof buildInvoiceLineRows> | null = null
  if (body.lines !== undefined) {
    const totals = invoiceTotals(body.lines, effectiveTaxRate)
    patch.subtotal = totals.subtotal
    patch.taxAmount = totals.taxAmount
    patch.total = totals.total
    newLineRows = buildInvoiceLineRows(id, body.lines)
  } else if (body.taxRate !== undefined) {
    const lines = await db.select().from(invoiceLine).where(eq(invoiceLine.invoiceId, id)).all()
    const totals = invoiceTotals(lines, effectiveTaxRate)
    patch.subtotal = totals.subtotal
    patch.taxAmount = totals.taxAmount
    patch.total = totals.total
  }

  // When lines change, the delete + insert + invoice update must be atomic —
  // otherwise a failure between them could leave the invoice with no lines but
  // stale totals. db.batch runs as a single D1 transaction (all-or-nothing).
  const writeInvoice = db.update(invoice).set(patch).where(eq(invoice.id, id))
  try {
    if (newLineRows !== null) {
      const clearLines = db.delete(invoiceLine).where(eq(invoiceLine.invoiceId, id))
      await (newLineRows.length
        ? db.batch([clearLines, db.insert(invoiceLine).values(newLineRows), writeInvoice])
        : db.batch([clearLines, writeInvoice]))
    } else {
      await writeInvoice
    }
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      throw createError({
        statusCode: 409,
        statusMessage: `Invoice number "${patch.number}" is already in use`
      })
    }
    throw e
  }

  const updated = await db.select().from(invoice).where(eq(invoice.id, id)).get()
  const lines = await db
    .select()
    .from(invoiceLine)
    .where(eq(invoiceLine.invoiceId, id))
    .orderBy(invoiceLine.sortOrder)
    .all()

  return toInvoiceDto(updated!, lines)
})
