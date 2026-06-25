-- Invoicing for growers: per-user settings, reusable customer contacts, and
-- invoices with line items. App-owned tables (written via Drizzle): money is
-- integer pence, dates are epoch millis, booleans are 0/1, taxRate is basis
-- points (2000 = 20%). See server/db/schema.ts for the matching Drizzle defs.

-- One row per user. Holds the "from" header, bank/payment details, and the
-- running invoice-number counter. Created on demand (get-or-create).
CREATE TABLE IF NOT EXISTS invoice_settings (
  userId            TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  businessName      TEXT,
  email             TEXT,
  phone             TEXT,
  address           TEXT,                          -- multiline freeform
  vatNumber         TEXT,
  bankName          TEXT,
  accountName       TEXT,
  accountNumber     TEXT,
  sortCode          TEXT,
  paymentNotes      TEXT,                          -- IBAN / PayPal / "BACS only" etc.
  taxRate           INTEGER NOT NULL DEFAULT 0,    -- default VAT rate, basis points
  invoicePrefix     TEXT NOT NULL DEFAULT 'INV-',
  nextInvoiceNumber INTEGER NOT NULL DEFAULT 1,
  numberPadding     INTEGER NOT NULL DEFAULT 4,    -- zero-pad width: 4 -> "0001"
  paymentTermsDays  INTEGER NOT NULL DEFAULT 14,   -- drives the default due date
  footerNotes       TEXT,                          -- default note printed on invoices
  logoKey           TEXT,                          -- optional R2 key
  createdAt         INTEGER NOT NULL,
  updatedAt         INTEGER NOT NULL
);

-- Reusable customer contacts. Created the first time a name is used on an
-- invoice (or via the contact picker); reused on later invoices.
CREATE TABLE IF NOT EXISTS customer (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  email     TEXT,
  phone     TEXT,
  address   TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_userId_idx ON customer(userId);

-- The invoice. customerId is a soft link (kept for "bill the same contact
-- again"); the customer* columns snapshot the contact at issue time so editing
-- a contact later never rewrites past invoices. Totals are server-computed and
-- stored (subtotal/tax/total) so the list can show amounts without joining lines.
CREATE TABLE IF NOT EXISTS invoice (
  id              TEXT PRIMARY KEY,
  userId          TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  customerId      TEXT REFERENCES customer(id) ON DELETE SET NULL,
  number          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft | sent | paid
  issueDate       INTEGER NOT NULL,
  dueDate         INTEGER,
  customerName    TEXT NOT NULL,                  -- snapshot
  customerEmail   TEXT,
  customerPhone   TEXT,
  customerAddress TEXT,
  notes           TEXT,
  taxRate         INTEGER NOT NULL DEFAULT 0,     -- basis points, snapshot of settings
  subtotal        INTEGER NOT NULL DEFAULT 0,     -- pence
  taxAmount       INTEGER NOT NULL DEFAULT 0,     -- pence
  total           INTEGER NOT NULL DEFAULT 0,     -- pence
  createdAt       INTEGER NOT NULL,
  updatedAt       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_userId_idx ON invoice(userId);
CREATE INDEX IF NOT EXISTS invoice_user_status_idx ON invoice(userId, status);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_user_number_idx ON invoice(userId, number);

-- Line items. flowerId is an optional soft link (sourced from the grower's
-- flower list); arbitrary lines just leave it null. amount = round(quantity *
-- unitPrice), computed and stored server-side.
CREATE TABLE IF NOT EXISTS invoice_line (
  id          TEXT PRIMARY KEY,
  invoiceId   TEXT NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  flowerId    TEXT REFERENCES flower(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity    REAL NOT NULL DEFAULT 1,
  unitPrice   INTEGER NOT NULL DEFAULT 0,         -- pence
  amount      INTEGER NOT NULL DEFAULT 0,         -- pence
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  createdAt   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_line_invoiceId_idx ON invoice_line(invoiceId);
