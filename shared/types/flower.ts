export interface FlowerDto {
  id: string
  name: string
  variety: string | null
  color: string | null
  stemLengthCm: number | null
  stemsPerBunch: number | null
  pricePerStem: number | null // pence
  pricePerBunch: number | null // pence (resolved or override)
  openToOffers: boolean // grower will consider offers on the price
  // Stems available: null = available (count unspecified), 0 = sold out, >0 = count.
  stemsAvailable: number | null
  notes: string | null
  sortOrder: number
  photoUrls: string[] // resolved /img URLs, primary first
  updatedAt: number // epoch ms
}
