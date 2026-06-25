import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getOrCreateInvoiceSettings, toInvoiceSettingsDto } from '~~/server/utils/invoice'
import type { InvoiceSettingsDto } from '~~/shared/types/invoice'

/** GET /api/invoice-settings — the signed-in user's invoice settings (defaults
 *  are created on first access so the number counter always has a home). */
export default defineEventHandler(async (event): Promise<InvoiceSettingsDto> => {
  const user = await requireUser(event)
  const db = useDb(event)
  const row = await getOrCreateInvoiceSettings(db, user.id)
  return toInvoiceSettingsDto(row)
})
