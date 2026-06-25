import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { customerCreateSchema } from '~~/server/utils/invoiceSchemas'
import { customer } from '~~/server/db/schema'
import type { CustomerDto } from '~~/shared/types/invoice'

/** POST /api/customers — save a contact for reuse on future invoices. */
export default defineEventHandler(async (event): Promise<CustomerDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const fields = await readZodBody(event, customerCreateSchema)
  const now = new Date()
  const id = crypto.randomUUID()

  const created = await db
    .insert(customer)
    .values({ id, userId: user.id, ...fields, createdAt: now, updatedAt: now })
    .returning()
    .get()

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    phone: created.phone,
    address: created.address
  }
})
