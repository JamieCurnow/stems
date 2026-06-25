import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam } from '~~/server/utils/validation'
import { toInvoiceDto } from '~~/server/utils/invoice'
import { invoice, invoiceLine } from '~~/server/db/schema'
import type { InvoiceDto } from '~~/shared/types/invoice'

/** GET /api/invoices/[id] — a full invoice with its line items. */
export default defineEventHandler(async (event): Promise<InvoiceDto> => {
  const user = await requireUser(event)
  const db = useDb(event)
  const id = getSafeRouterParam(event, 'id')

  const row = await db.select().from(invoice).where(eq(invoice.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  if (row.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Not your invoice' })

  const lines = await db
    .select()
    .from(invoiceLine)
    .where(eq(invoiceLine.invoiceId, id))
    .orderBy(invoiceLine.sortOrder)
    .all()

  return toInvoiceDto(row, lines)
})
