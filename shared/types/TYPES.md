# Types

Shared TypeScript interfaces used across client and server. These are the **API/DTO** types (what crosses the wire). The database row types (`ProfileRow`, `FlowerRow`, etc.) are inferred from the Drizzle schema in `server/db/schema.ts` — see that file, not here.

---

## `FlowerDto`

The client-facing shape of a flower (`shared/types/flower.ts`). Returned by the flowers API and the public profile API; consumed by `<FlowerCard>`, `<FlowerForm>`, and the public page. **Prices are integer pence; photos are resolved `/img` URLs, never raw R2 keys; `updatedAt` is epoch ms.** Built from a `FlowerRow` via `toFlowerDto()`.

- `id`: `string`
- `name`: `string`
- `variety`: `string | null`
- `color`: `string | null`
- `stemLengthCm`: `number | null`
- `stemsPerBunch`: `number | null`
- `pricePerStem`: `number | null` — pence
- `pricePerBunch`: `number | null` — pence (explicit override, else derived from stem × count via `bunchPrice`)
- `openToOffers`: `boolean`
- `availabilityStatus`: `AvailabilityStatus | null` — categorical hint (`good` / `limited` / `very_limited` / `sold_out` / `midweek` / `next_week` / `soon`), or `null`. Set independently of `stemsAvailable` — a grower may use either, both, or neither. See `shared/utils/flowers.ts`.
- `stemsAvailable`: `number | null` — `null` = available (count unspecified), `0` = sold out, `>0` = count
- `notes`: `string | null`
- `sortOrder`: `number`
- `photoUrls`: `string[]` — resolved `/img` URLs, primary (cover) first
- `updatedAt`: `number` — epoch ms

---

## Invoicing DTOs

The client-facing shapes for invoicing (`shared/types/invoice.ts`). **Money is integer pence; `taxRate` is basis points (2000 = 20%); dates are epoch ms.** Built from Drizzle rows via the mappers in `server/utils/invoice.ts`. Helpers live in `shared/utils/invoice.ts` (`invoiceTotals`, `lineAmount`, `taxRateLabel`, `percentToBasisPoints`, `formatInvoiceNumber`, `INVOICE_STATUSES`).

- **`InvoiceStatus`** — `'draft' | 'sent' | 'paid'`.
- **`InvoiceSettingsDto`** — the grower's "from" header, bank/payment details and numbering defaults. `taxRate` (basis points), `invoicePrefix`, `nextInvoiceNumber`, `numberPadding`, `paymentTermsDays`, plus `logoUrl` (resolved `/img`, never the raw R2 key). All other fields nullable strings.
- **`CustomerDto`** — a reusable contact: `id`, `name`, `email`, `phone`, `address`.
- **`InvoiceLineDto`** — `id`, `flowerId` (soft link, nullable), `description`, `quantity`, `unitPrice` (pence), `amount` (pence, server-computed).
- **`InvoiceDto`** — full invoice with `lines: InvoiceLineDto[]`. Carries the **snapshot** contact fields (`customerName`/`customerEmail`/`customerPhone`/`customerAddress`) plus the soft `customerId`, stored totals (`subtotal`/`taxAmount`/`total`), `number`, `status`, `issueDate`, `dueDate`, `notes`, `taxRate`.
- **`InvoiceListItemDto`** — the lighter table row (no lines): `id`, `number`, `status`, `customerName`, `issueDate`, `dueDate`, `total`.

---

## `PublicProfileDto`

The PUBLIC grower-page payload (`shared/types/profile.ts`). Returned by `GET /api/public/[handle]` alongside `FlowerDto[]`. Deliberately omits private fields (postcode, lat/lng, login email); contact details are public so buyers can reach the grower. Avatar/banner are resolved `/img` URLs.

- `handle`: `string`
- `farmName`: `string`
- `tagline`: `string | null` — short role/eyebrow shown above the name, e.g. "Florist & Gardener"
- `bio`: `string | null`
- `locationName`: `string | null`
- `instagram`: `string | null`
- `website`: `string | null`
- `whatsapp`: `string | null`
- `contactEmail`: `string | null`
- `preferredContact`: `ContactMethod | null`
- `avatarUrl`: `string | null` — resolved `/img` URL
- `bannerUrl`: `string | null`
- `isGrower`: `boolean`

---

## Related types declared elsewhere

These aren't in `shared/types/` but are part of the shared contract and worth knowing:

- **`ContactMethod`** (`shared/utils/contact.ts`) — `'whatsapp' | 'email' | 'instagram'`. Used by `PublicProfileDto.preferredContact` and `contactOptions()`.
- **`GrowerCardDto`** (`server/api/search.get.ts`) — the discovery result row (`handle`, `farmName`, `locationName`, `avatarUrl`, `flowerCount`, `lastActiveAt`). Exported from the endpoint and imported by `/discover` + `<GrowerCard>`.
- **Drizzle row + insert types** (`server/db/schema.ts`) — `ProfileRow`, `FlowerRow`, `FlowerPhotoRow`, `InvoiceSettingsRow`, `CustomerRow`, `InvoiceRow`, `InvoiceLineRow`, `SubscriptionRow`, `ReferralRow`, `EmailPreferencesRow`, `LeadRow`, `ScheduledEmailRow`, etc. (`typeof table.$inferSelect`). The client imports `ProfileRow` directly in a few places (e.g. `useProfile`, account pages).

---

## Learnings

- **DTOs ≠ rows.** API responses use the `*Dto` types here (resolved `/img` URLs, prices in pence, epoch-ms timestamps), built from Drizzle rows via mappers like `toFlowerDto()`. Never return raw rows that leak R2 keys or private columns — the public profile endpoint hand-picks columns for exactly this reason.
- **No `BaseDocument` / `ToMongoDoc` / `_id` here.** This app is Cloudflare D1 + Drizzle, not MongoDB. Persisted-entity types come from `$inferSelect` on the Drizzle schema; there's no ObjectId, no `created`/`updated` ISO-string base.
- **Availability has two independent signals** — a categorical `availabilityStatus` and a numeric `stemsAvailable` tri-state (`null` / `0` / `>0`). Sold-out is derivable from EITHER (a `0` count or the `sold_out` status), so use the canonical helpers in `shared/utils/flowers.ts` (`isInStock`/`isSoldOut` take a flower-like object; `stemsLabel`, `stemsCountLabel`, `availabilityStatusMeta`, `availabilityStatusLabel`) rather than checking `stemsAvailable === 0` directly.
- **Prices are pence end-to-end.** The only pounds↔pence conversion happens at the form `<input>` boundary (`parsePounds` / `formatPence` in `shared/utils/price.ts`).
