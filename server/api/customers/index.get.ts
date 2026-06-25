import { asc, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { customer } from '~~/server/db/schema'
import type { CustomerDto } from '~~/shared/types/invoice'

/** GET /api/customers — the signed-in user's saved contacts, for the invoice
 *  customer picker. Sorted by name. */
export default defineEventHandler(async (event): Promise<CustomerDto[]> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const rows = await db
    .select({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    })
    .from(customer)
    .where(eq(customer.userId, user.id))
    .orderBy(asc(customer.name))
    .all()

  return rows
})
