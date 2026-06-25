// Wire DTOs for invoicing. Money is always integer pence; dates are epoch ms;
// taxRate is basis points (2000 = 20%). The client converts at the input
// boundary (parsePounds) and formats with formatPence.

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface InvoiceSettingsDto {
  businessName: string | null
  email: string | null
  phone: string | null
  address: string | null
  vatNumber: string | null
  bankName: string | null
  accountName: string | null
  accountNumber: string | null
  sortCode: string | null
  paymentNotes: string | null
  taxRate: number // basis points
  invoicePrefix: string
  nextInvoiceNumber: number
  numberPadding: number
  paymentTermsDays: number
  footerNotes: string | null
  logoUrl: string | null // resolved /img URL (never the raw R2 key)
}

export interface CustomerDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
}

export interface InvoiceLineDto {
  id: string
  flowerId: string | null
  description: string
  quantity: number
  unitPrice: number // pence
  amount: number // pence (quantity * unitPrice, server-computed)
}

// Full invoice with its lines (detail + edit pages).
export interface InvoiceDto {
  id: string
  customerId: string | null
  number: string
  status: InvoiceStatus
  issueDate: number // epoch ms
  dueDate: number | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  notes: string | null
  taxRate: number // basis points
  subtotal: number // pence
  taxAmount: number // pence
  total: number // pence
  lines: InvoiceLineDto[]
  createdAt: number
  updatedAt: number
}

// Lighter row for the list/table view (no lines).
export interface InvoiceListItemDto {
  id: string
  number: string
  status: InvoiceStatus
  customerName: string
  issueDate: number
  dueDate: number | null
  total: number // pence
}
