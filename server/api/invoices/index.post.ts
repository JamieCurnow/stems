import { and, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import type { Db } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { readZodBody } from '~~/server/utils/validation'
import { invoiceCreateSchema } from '~~/server/utils/invoiceSchemas'
import type { InvoiceLineInput } from '~~/server/utils/invoiceSchemas'
import { getOrCreateInvoiceSettings, toInvoiceDto } from '~~/server/utils/invoice'
import { customer, invoice, invoiceLine, invoiceSettings, type InvoiceSettingsRow } from '~~/server/db/schema'
import { invoiceTotals, lineAmount, formatInvoiceNumber } from '~~/shared/utils/invoice'
import type { InvoiceDto } from '~~/shared/types/invoice'

/* Shared building blocks, also imported by [id].patch.ts. */

/** The snapshot contact fields persisted on an invoice (and optionally saved
 *  as a reusable customer). */
export interface ResolveCustomerInput {
  customerId: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  saveCustomer?: boolean
}

/**
 * Resolve the customer for an invoice:
 *  - a provided customerId is verified to belong to the user (else ignored);
 *  - otherwise, when saveCustomer is set, the typed contact is saved to the
 *    reusable customer list and that id is linked.
 * Returns the (possibly new) customerId; the caller always snapshots the typed
 * contact fields onto the invoice regardless.
 */
export const resolveCustomerId = async (
  db: Db,
  userId: string,
  input: ResolveCustomerInput
): Promise<string | null> => {
  if (input.customerId) {
    const owned = await db
      .select({ id: customer.id })
      .from(customer)
      .where(and(eq(customer.id, input.customerId), eq(customer.userId, userId)))
      .get()
    if (owned) return owned.id
  }

  if (input.saveCustomer && input.customerName) {
    const now = new Date()
    const id = crypto.randomUUID()
    await db.insert(customer).values({
      id,
      userId,
      name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      address: input.customerAddress,
      createdAt: now,
      updatedAt: now
    })
    return id
  }

  return null
}

/** Insert the line rows for an invoice, computing each amount server-side. */
export const insertInvoiceLines = async (
  db: Db,
  invoiceId: string,
  lines: InvoiceLineInput[]
): Promise<void> => {
  if (!lines.length) return
  const now = new Date()
  await db.insert(invoiceLine).values(
    lines.map((l, i) => ({
      id: crypto.randomUUID(),
      invoiceId,
      flowerId: l.flowerId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: lineAmount(l),
      sortOrder: i,
      createdAt: now
    }))
  )
}

/**
 * Find the next free auto-generated invoice number for this user, advancing the
 * settings counter past any manual collisions. Returns the number plus the new
 * counter value to persist.
 */
export const nextFreeInvoiceNumber = async (
  db: Db,
  userId: string,
  settings: InvoiceSettingsRow
): Promise<{ number: string; nextCounter: number }> => {
  let n = settings.nextInvoiceNumber
  // Guard against an unbounded loop while still skipping any manual collisions.
  for (let i = 0; i < 10_000; i++) {
    const candidate = formatInvoiceNumber(settings.invoicePrefix, n, settings.numberPadding)
    const clash = await db
      .select({ id: invoice.id })
      .from(invoice)
      .where(and(eq(invoice.userId, userId), eq(invoice.number, candidate)))
      .get()
    if (!clash) return { number: candidate, nextCounter: n + 1 }
    n++
  }
  // Fallback: a uuid-suffixed number is guaranteed unique.
  return { number: `${settings.invoicePrefix}${crypto.randomUUID().slice(0, 8)}`, nextCounter: n }
}

/**
 * POST /api/invoices — create an invoice for the signed-in user. Resolves/saves
 * the customer, snapshots the contact, recomputes totals from the lines, and
 * auto-generates the invoice number (bumping the counter) unless one is given.
 */
export default defineEventHandler(async (event): Promise<InvoiceDto> => {
  const user = await requireUser(event)
  const db = useDb(event)

  const body = await readZodBody(event, invoiceCreateSchema)
  const settings = await getOrCreateInvoiceSettings(db, user.id)

  const customerId = await resolveCustomerId(db, user.id, body)

  // Number: explicit override, else auto-generate and advance the counter.
  let number = body.number
  if (!number) {
    const next = await nextFreeInvoiceNumber(db, user.id, settings)
    number = next.number
    await db
      .update(invoiceSettings)
      .set({ nextInvoiceNumber: next.nextCounter, updatedAt: new Date() })
      .where(eq(invoiceSettings.userId, user.id))
  }

  const { subtotal, taxAmount, total } = invoiceTotals(body.lines, body.taxRate)

  const now = new Date()
  const id = crypto.randomUUID()

  try {
    await db.insert(invoice).values({
      id,
      userId: user.id,
      customerId,
      number,
      status: body.status,
      issueDate: new Date(body.issueDate),
      dueDate: body.dueDate != null ? new Date(body.dueDate) : null,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress,
      notes: body.notes,
      taxRate: body.taxRate,
      subtotal,
      taxAmount,
      total,
      createdAt: now,
      updatedAt: now
    })
  } catch (e) {
    // Unique (userId, number) collision on a manual number.
    if (String(e).includes('UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: `Invoice number "${number}" is already in use` })
    }
    throw e
  }

  await insertInvoiceLines(db, id, body.lines)

  const created = await db.select().from(invoice).where(eq(invoice.id, id)).get()
  const lines = await db
    .select()
    .from(invoiceLine)
    .where(eq(invoiceLine.invoiceId, id))
    .orderBy(invoiceLine.sortOrder)
    .all()

  return toInvoiceDto(created!, lines)
})
