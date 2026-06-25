import { asc, eq } from 'drizzle-orm'
import { useDb } from '~~/server/utils/db'
import { requireUser } from '~~/server/utils/requireUser'
import { getSafeRouterParam } from '~~/server/utils/validation'
import { getOrCreateInvoiceSettings, toInvoiceDto } from '~~/server/utils/invoice'
import { sendEmail } from '~~/server/utils/email'
import { invoice, invoiceLine, profile } from '~~/server/db/schema'
import { formatPence } from '~~/shared/utils/price'
import { formatDate } from '~~/shared/utils/time'
import { taxRateLabel } from '~~/shared/utils/invoice'
import type { InvoiceEmailProps } from '~~/server/emails/invoice'
import type { InvoiceDto } from '~~/shared/types/invoice'

/**
 * POST /api/invoices/[id]/send — email the invoice to its customer via Resend,
 * then mark it as sent. Requires a customer email. Reply-To is set to the
 * grower (invoice-settings email → profile contact email) so replies reach them.
 * A paid invoice keeps its status; anything else becomes "sent".
 */
export default defineEventHandler(async (event): Promise<InvoiceDto> => {
  const user = await requireUser(event)
  const db = useDb(event)
  const id = getSafeRouterParam(event, 'id')

  const row = await db.select().from(invoice).where(eq(invoice.id, id)).get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  if (row.userId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Not your invoice' })

  if (!row.customerEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Add a customer email to this invoice before sending.'
    })
  }

  const [lines, settings, prof] = await Promise.all([
    db
      .select()
      .from(invoiceLine)
      .where(eq(invoiceLine.invoiceId, id))
      .orderBy(asc(invoiceLine.sortOrder))
      .all(),
    getOrCreateInvoiceSettings(db, user.id),
    db.select().from(profile).where(eq(profile.userId, user.id)).get()
  ])

  const businessName = settings.businessName || prof?.farmName || 'Your business'
  const replyTo = settings.email || prof?.contactEmail || undefined

  const props: InvoiceEmailProps = {
    number: row.number,
    businessName,
    customerName: row.customerName,
    issueDateLabel: formatDate(row.issueDate.getTime()),
    dueDateLabel: row.dueDate ? formatDate(row.dueDate.getTime()) : null,
    lines: lines.map((l) => ({
      description: l.description,
      qty: String(l.quantity),
      unit: formatPence(l.unitPrice),
      amount: formatPence(l.amount)
    })),
    subtotalLabel: formatPence(row.subtotal),
    showTax: row.taxRate > 0,
    taxRateLabel: taxRateLabel(row.taxRate),
    taxAmountLabel: formatPence(row.taxAmount),
    totalLabel: formatPence(row.total),
    notes: row.notes,
    payment: {
      bankName: settings.bankName,
      accountName: settings.accountName,
      sortCode: settings.sortCode,
      accountNumber: settings.accountNumber,
      paymentNotes: settings.paymentNotes
    },
    fromEmail: replyTo ?? null
  }

  await sendEmail(event, {
    emailId: 'invoice',
    to: row.customerEmail,
    props: props as unknown as Record<string, unknown>,
    replyTo,
    // Re-sending after an edit (updatedAt changes) is allowed; a double-click in
    // the same state dedupes at Resend.
    idempotencyKey: `invoice-${id}-${row.updatedAt.getTime()}`
  })

  const nextStatus = row.status === 'paid' ? 'paid' : 'sent'
  const updated = await db
    .update(invoice)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(invoice.id, id))
    .returning()
    .get()

  return toInvoiceDto(updated, lines)
})
