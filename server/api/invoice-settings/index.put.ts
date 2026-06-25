import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { invoiceSettingsSchema } from '~~/server/utils/invoiceSchemas'
import { getOrCreateInvoiceSettings, toInvoiceSettingsDto } from '~~/server/utils/invoice'
import { invoiceSettings } from '~~/server/db/schema'
import type { InvoiceSettingsDto } from '~~/shared/types/invoice'

/** PUT /api/invoice-settings — upsert the signed-in user's invoice settings.
 *  The whole object is sent by the settings form; we merge it over the existing
 *  (or freshly-defaulted) row. */
export default defineEventHandler(async (event): Promise<InvoiceSettingsDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const updates = await readZodBody(event, invoiceSettingsSchema)

  // Ensure a row exists (and its counter) before updating.
  await getOrCreateInvoiceSettings(db, user.id)

  const updated = await db
    .update(invoiceSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(invoiceSettings.userId, user.id))
    .returning()
    .get()

  return toInvoiceSettingsDto(updated)
})
