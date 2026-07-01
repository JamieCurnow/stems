import type { ContactMethod } from '~~/shared/utils/contact'

export interface PublicProfileDto {
  handle: string
  farmName: string
  tagline: string | null // short role/eyebrow e.g. "Florist & Gardener"
  bio: string | null
  locationName: string | null
  instagram: string | null
  website: string | null
  // Contact details — deliberately public so buyers can reach the grower.
  whatsapp: string | null
  contactEmail: string | null
  preferredContact: ContactMethod | null
  avatarUrl: string | null // resolved /img URL, not raw key
  bannerUrl: string | null
  isGrower: boolean
}
