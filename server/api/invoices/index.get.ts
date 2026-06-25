import { desc, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { toInvoiceListItemDto } from '~~/server/utils/invoice'
import { invoice } from '~~/server/db/schema'
import type { InvoiceListItemDto } from '~~/shared/types/invoice'

/** GET /api/invoices — the signed-in user's invoices for the table view
 *  (newest issue date first). No line items; totals are stored on the row. */
export default defineEventHandler(async (event): Promise<InvoiceListItemDto[]> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const rows = await db
    .select()
    .from(invoice)
    .where(eq(invoice.userId, user.id))
    .orderBy(desc(invoice.issueDate), desc(invoice.createdAt))
    .all()

  return rows.map(toInvoiceListItemDto)
})
