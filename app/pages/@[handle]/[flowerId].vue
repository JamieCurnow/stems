<script setup lang="ts">
// Public, read-only flower detail at /@handle/<flowerId>. Previously a bottom
// drawer on the grower page, but tall flowers (many photos + notes) couldn't be
// scrolled inside the sheet — so it's a real, naturally-scrollable page now.
// SSR-rendered so an individual flower is shareable with a link preview.
//
// It reuses the grower-page payload (same useFetch key) so arriving from the
// listing is instant (no refetch) and the profile is on hand for the contact
// sheet; deep-links fetch server-side.
import { normaliseHandle } from '~~/shared/utils/handle'
import { availabilityText, isSoldOut } from '~~/shared/utils/flowers'
import { timeAgo } from '~~/shared/utils/time'
import { bunchPrice, formatPence } from '~~/shared/utils/price'
import { contactOptions } from '~~/shared/utils/contact'
import type { PublicProfileDto } from '~~/shared/types/profile'
import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ layout: 'app' })

const route = useRoute()
const router = useRouter()
// Defensive: route param can carry a leading '@'; strip + normalise.
const handle = normaliseHandle(String(route.params.handle ?? ''))
const flowerId = String(route.params.flowerId ?? '')

// Same payload + key as the grower page, so navigating from the listing hits the
// cache (no second request) and back/forward stays instant.
const { data, error } = await useFetch<{ profile: PublicProfileDto; flowers: FlowerDto[] }>(
  `/api/public/${handle}`,
  { key: `public-profile-${handle}` }
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
}

const profile = computed(() => data.value!.profile)
const flower = computed(() => data.value!.flowers.find((f) => f.id === flowerId) ?? null)

// Unknown / archived flower id → 404 (matches the grower-page behaviour).
if (!flower.value) {
  throw createError({ statusCode: 404, statusMessage: 'Flower not found' })
}

const growerUrl = computed(() => `/@${profile.value.handle}`)

// Back affordance: prefer a real history pop so the grower list restores its
// saved scroll position; fall back to the grower page for deep-links (where
// there's nowhere to go back to within the app).
function goBack() {
  if (import.meta.client && window.history.state?.back) {
    router.back()
  } else {
    router.push(growerUrl.value)
  }
}

const subtitle = computed(() =>
  flower.value ? [flower.value.variety, flower.value.color].filter(Boolean).join(' · ') : ''
)
const meta = computed(() => {
  const f = flower.value
  if (!f) return ''
  const parts: string[] = []
  if (f.stemLengthCm != null) parts.push(`${f.stemLengthCm}cm long`)
  if (f.stemsPerBunch != null) parts.push(`${f.stemsPerBunch} per bunch`)
  return parts.join(' · ')
})
const priceLine = computed(() => {
  const f = flower.value
  if (!f) return ''
  const parts: string[] = []
  if (f.pricePerStem != null) parts.push(`${formatPence(f.pricePerStem)}/stem`)
  const b = bunchPrice(f)
  if (b != null) parts.push(`${formatPence(b)}/bunch`)
  return parts.join(' · ')
})

// Contact: only when the grower has given a way to reach them. Opens a sheet of
// deep links (no in-app messaging) — same component as the grower page.
const hasContact = computed(() => contactOptions(profile.value).length > 0)
const contactOpen = ref(false)

// ── SEO / social sharing ──────────────────────────────────────────────────
// OG image must be ABSOLUTE for link unfurlers; resolve the /img path against
// this request's origin.
const requestUrl = useRequestURL()
const origin = computed(() => requestUrl.origin)
const ogImage = computed(() => {
  const rel = flower.value?.photoUrls[0] || profile.value.avatarUrl
  return rel ? new URL(rel, origin.value).href : undefined
})
const pageTitle = computed(() => `${flower.value?.name} · ${profile.value.farmName} · Stems`)
const pageDescription = computed(() => {
  const bits = [subtitle.value, priceLine.value].filter(Boolean).join(' · ')
  return bits
    ? `${flower.value?.name} from ${profile.value.farmName} — ${bits}.`
    : `${flower.value?.name} from ${profile.value.farmName} on Stems.`
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage,
  ogUrl: () => `${origin.value}/@${profile.value.handle}/${flowerId}`,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage
})
</script>

<template>
  <div v-if="flower" class="pb-8">
    <!-- Back to the grower's listing. A button (not a link) so it pops history
         and restores the list's scroll position; deep-links fall back to the
         grower page. -->
    <button
      type="button"
      class="-ml-1 mt-1 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1 pr-3 text-sm font-medium text-muted transition-colors hover:text-default"
      @click="goBack"
    >
      <UIcon name="i-lucide-chevron-left" class="size-5" />
      {{ profile.farmName }}
    </button>

    <div class="mx-auto mt-2 w-full max-w-md space-y-4">
      <!-- Keyed by id so the rail resets to the cover when switching flowers. -->
      <FlowerGallery :key="flower.id" :photos="flower.photoUrls" :alt="flower.name" />

      <div>
        <div>
          <h1 class="font-display text-3xl font-medium leading-tight text-default">{{ flower.name }}</h1>
          <p v-if="subtitle" class="mt-0.5 text-muted">{{ subtitle }}</p>
        </div>

        <!-- Availability reads exactly as it does in the listing. -->
        <p class="mt-3 text-sm text-muted">
          Availability:
          <span class="font-medium" :class="isSoldOut(flower) ? 'text-dimmed' : 'text-default'">
            {{ availabilityText(flower) }}
          </span>
        </p>

        <p v-if="priceLine" class="mt-3 text-lg font-medium text-default">{{ priceLine }}</p>
        <span
          v-if="flower.openToOffers"
          class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
        >
          <UIcon name="i-lucide-tag" class="size-3.5" />
          Open to offers
        </span>
        <p v-if="meta" class="mt-1 text-sm text-muted">{{ meta }}</p>
        <p class="mt-1 text-xs text-dimmed">Updated {{ timeAgo(flower.updatedAt) }}</p>

        <div v-if="flower.notes" class="mt-5">
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Notes</h2>
          <p class="mt-1.5 whitespace-pre-line text-sm text-default">{{ flower.notes }}</p>
        </div>

        <!-- Buy CTA, scoped to this flower. -->
        <UButton
          v-if="hasContact"
          color="primary"
          size="lg"
          block
          icon="i-lucide-message-circle"
          class="mt-6 font-medium"
          @click="contactOpen = true"
        >
          Contact
        </UButton>
      </div>
    </div>

    <ContactSheet v-if="hasContact" v-model:open="contactOpen" :profile="profile" />
  </div>
</template>
