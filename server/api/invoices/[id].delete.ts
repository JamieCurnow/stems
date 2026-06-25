import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam } from '~~/server/utils/validation'
import { invoice } from '~~/server/db/schema'

/** DELETE /api/invoices/[id] — hard delete (line items cascade). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDb(event)
  const id = getSafeRouterParam(event, 'id')

  const existing = await db.select({ userId: invoice.userId }).from(invoice).where(eq(invoice.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  if (existing.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Not your invoice' })

  await db.delete(invoice).where(eq(invoice.id, id))
  return { ok: true }
})
