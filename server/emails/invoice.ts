import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

/**
 * Invoice email — sent to a grower's customer when they hit "Send" on an
 * invoice. The grower isn't a Stems-aware recipient, so everything they need
 * (line items, totals, how to pay) is in the body; the Reply-To is set to the
 * grower so replies go to them. All money/date values arrive pre-formatted from
 * the endpoint (the template just lays them out + escapes them).
 */
export interface InvoiceEmailLine {
  description: string
  qty: string
  unit: string
  amount: string
}

export interface InvoiceEmailProps {
  number: string
  businessName: string
  customerName: string
  issueDateLabel: string
  dueDateLabel?: string | null
  lines: InvoiceEmailLine[]
  subtotalLabel: string
  showTax: boolean
  taxRateLabel?: string
  taxAmountLabel?: string
  totalLabel: string
  notes?: string | null
  payment?: {
    bankName?: string | null
    accountName?: string | null
    sortCode?: string | null
    accountNumber?: string | null
    paymentNotes?: string | null
  } | null
  fromEmail?: string | null
}

const cell = (content: string, align: 'left' | 'right' = 'left', muted = false): string =>
  `<td style="padding:8px 0;border-bottom:1px solid #F0E6E1;font-size:14px;text-align:${align};${muted ? 'color:#6B625C;' : 'color:#1B1B1B;'}vertical-align:top;">${content}</td>`

const template: EmailTemplate<InvoiceEmailProps> = (p) => {
  const rows = p.lines
    .map(
      (l) =>
        `<tr>${cell(escapeHtml(l.description))}${cell(escapeHtml(l.qty), 'right', true)}${cell(escapeHtml(l.unit), 'right', true)}${cell(escapeHtml(l.amount), 'right')}</tr>`
    )
    .join('')

  const totalRow = (label: string, value: string, bold = false) =>
    `<tr><td colspan="2"></td><td style="padding:6px 0;font-size:14px;color:#6B625C;text-align:right;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;text-align:right;${bold ? 'font-weight:700;color:#1B1B1B;' : 'color:#1B1B1B;'}">${escapeHtml(value)}</td></tr>`

  const payment = p.payment
  const paymentLines: string[] = []
  if (payment?.bankName) paymentLines.push(escapeHtml(payment.bankName))
  if (payment?.accountName) paymentLines.push(escapeHtml(payment.accountName))
  if (payment?.sortCode || payment?.accountNumber) {
    const bits: string[] = []
    if (payment.sortCode) bits.push(`Sort code ${escapeHtml(payment.sortCode)}`)
    if (payment.accountNumber) bits.push(`Acc ${escapeHtml(payment.accountNumber)}`)
    paymentLines.push(bits.join(' &middot; '))
  }
  if (payment?.paymentNotes) paymentLines.push(escapeHtml(payment.paymentNotes))

  const paymentHtml = paymentLines.length
    ? `<div style="margin:24px 0 0;padding:16px;background:#FEF5F3;border-radius:8px;">
         <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8A817B;font-weight:600;">How to pay</p>
         <p style="margin:0;font-size:14px;line-height:1.6;color:#1B1B1B;">${paymentLines.join('<br/>')}</p>
       </div>`
    : ''

  const notesHtml = p.notes
    ? `<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#6B625C;">${escapeHtml(p.notes)}</p>`
    : ''

  const dueHtml = p.dueDateLabel ? ` &middot; <strong>Due ${escapeHtml(p.dueDateLabel)}</strong>` : ''

  return {
    subject: `Invoice ${p.number} from ${p.businessName}`,
    preheader: `${p.totalLabel} due${p.dueDateLabel ? ` by ${p.dueDateLabel}` : ''}`,
    html: `
      <p style="margin:0 0 4px;font-size:14px;color:#6B625C;">Invoice <strong>${escapeHtml(p.number)}</strong></p>
      <p style="margin:0 0 20px;font-family:'EB Garamond',Georgia,serif;font-size:22px;color:#1B1B1B;">${escapeHtml(p.businessName)}</p>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(p.customerName)}, here's your invoice. Issued ${escapeHtml(p.issueDateLabel)}${dueHtml}.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:8px 0 0;">
        <thead>
          <tr>
            <th style="padding:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A817B;text-align:left;">Description</th>
            <th style="padding:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A817B;text-align:right;">Qty</th>
            <th style="padding:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A817B;text-align:right;">Unit</th>
            <th style="padding:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A817B;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          ${totalRow('Subtotal', p.subtotalLabel)}
          ${p.showTax ? totalRow(`VAT (${p.taxRateLabel ?? ''})`, p.taxAmountLabel ?? '') : ''}
          ${totalRow('Total', p.totalLabel, true)}
        </tfoot>
      </table>

      ${paymentHtml}
      ${notesHtml}
      ${p.fromEmail ? `<p style="margin:24px 0 0;font-size:13px;color:#8A817B;">Questions? Just reply to this email.</p>` : ''}
    `,
    text: `Invoice ${p.number} from ${p.businessName}

Hi ${p.customerName}, here's your invoice. Issued ${p.issueDateLabel}${p.dueDateLabel ? ` · Due ${p.dueDateLabel}` : ''}.

${p.lines.map((l) => `- ${l.description}  ${l.qty} x ${l.unit} = ${l.amount}`).join('\n')}

Subtotal: ${p.subtotalLabel}${p.showTax ? `\nVAT (${p.taxRateLabel ?? ''}): ${p.taxAmountLabel ?? ''}` : ''}
Total: ${p.totalLabel}
${paymentLines.length ? `\nHow to pay:\n${[payment?.bankName, payment?.accountName, [payment?.sortCode && `Sort code ${payment.sortCode}`, payment?.accountNumber && `Acc ${payment.accountNumber}`].filter(Boolean).join(' · '), payment?.paymentNotes].filter(Boolean).join('\n')}` : ''}
${p.notes ? `\n${p.notes}` : ''}`
  }
}

export default template
