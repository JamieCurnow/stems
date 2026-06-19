<script setup lang="ts">
// Public, logged-out grower page at /@handle — the shareable wedge (doc 08).
// SSR-rendered so WhatsApp/iMessage/Instagram link previews resolve, and so the
// availability list is in the first paint. Uses the `app` layout (floating
// bottom nav) so navigation is consistent with the rest of the app — the tab
// bar already handles the logged-out case (Discover + Sign in). The availability
// list is a borderless feed (Toast × Instagram language) — see DESIGN.md.
import { useElementVisibility, useTimeAgo } from '@vueuse/core'
import { normaliseHandle } from '~~/shared/utils/handle'
import { avatarInitials, avatarTint } from '~~/shared/utils/avatar'
import { availabilityText, isSoldOut } from '~~/shared/utils/flowers'
import { timeAgo } from '~~/shared/utils/time'
import { bunchPrice, formatPence } from '~~/shared/utils/price'
import { contactOptions } from '~~/shared/utils/contact'
import type { PublicProfileDto } from '~~/shared/types/profile'
import type { FlowerDto } from '~~/shared/types/flower'

definePageMeta({ layout: 'app' })

const route = useRoute()
// Defensive: route param can carry a leading '@'; strip + normalise.
const handle = normaliseHandle(String(route.params.handle ?? ''))

// The API path uses the BARE handle ('@' lives only in the browser URL).
const { data, error } = await useFetch<{ profile: PublicProfileDto; flowers: FlowerDto[] }>(
  `/api/public/${handle}`,
  { key: `public-profile-${handle}` }
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
}

const profile = computed(() => data.value!.profile)
const flowers = computed(() => data.value!.flowers)

// Photo-less avatar: warm, deterministic tint keyed off the handle + serif
// initials — the same treatment as the discovery feed (Grower/Card.vue) so a
// grower looks consistent wherever they appear.
const tint = computed(() => avatarTint(profile.value.handle))
const initials = computed(() => avatarInitials(profile.value.farmName))

// "● N in season" — anything in stock right now (not sold out by count or status).
const inSeasonCount = computed(() => flowers.value.filter((f) => !isSoldOut(f)).length)

function subtitleFor(f: FlowerDto) {
  return [f.variety, f.color, f.stemLengthCm != null ? `${f.stemLengthCm}cm` : null]
    .filter(Boolean)
    .join(' · ')
}
function priceLineFor(f: FlowerDto) {
  const parts: string[] = []
  if (f.pricePerStem != null) parts.push(`${formatPence(f.pricePerStem)}/stem`)
  const b = bunchPrice(f)
  if (b != null) parts.push(`${formatPence(b)}/bunch`)
  return parts.join(' · ')
}

const websiteUrl = computed(() => {
  const w = profile.value.website
  if (!w) return null
  return /^https?:\/\//i.test(w) ? w : `https://${w}`
})
const websiteLabel = computed(() =>
  profile.value.website ? profile.value.website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : ''
)
const instagramUrl = computed(() =>
  profile.value.instagram ? `https://instagram.com/${profile.value.instagram}` : null
)

// "Contact to buy" — only shown when the grower has given at least one way to
// reach them. Opens a sheet of deep links (no in-app messaging).
const hasContact = computed(() => contactOptions(profile.value).length > 0)
const contactOpen = ref(false)
function openContact() {
  // Close the flower detail first so the two sheets don't stack.
  detailOpen.value = false
  contactOpen.value = true
}

// Floating "Contact to buy": once the inline hero CTA scrolls out of view, a
// large fixed button hovers just above the bottom nav so buyers can always reach
// the grower. Hidden while the flower drawer is open (it has its own buy CTA).
const contactInlineRef = ref<HTMLElement | null>(null)
const contactInlineVisible = useElementVisibility(contactInlineRef)
const showFloatingContact = computed(
  () => hasContact.value && !contactInlineVisible.value && !detailOpen.value
)

// "Updated X ago" — from the most recently edited visible flower. Omitted when
// there are no flowers (nothing to signal freshness about).
const lastUpdated = computed(() => {
  if (!flowers.value.length) return null
  return Math.max(...flowers.value.map((f) => f.updatedAt))
})
const updatedAgo = useTimeAgo(() => lastUpdated.value ?? Date.now())

// Read-only flower detail (public): page-managed so we don't depend on the
// card's editable-only events. Tapping a card opens a drawer with full info.
const selected = ref<FlowerDto | null>(null)
const detailOpen = ref(false)
function openDetail(flower: FlowerDto) {
  selected.value = flower
  detailOpen.value = true
}
const detailSubtitle = computed(() =>
  selected.value ? [selected.value.variety, selected.value.color].filter(Boolean).join(' · ') : ''
)
const detailMeta = computed(() => {
  const f = selected.value
  if (!f) return ''
  const parts: string[] = []
  if (f.stemLengthCm != null) parts.push(`${f.stemLengthCm}cm long`)
  if (f.stemsPerBunch != null) parts.push(`${f.stemsPerBunch} per bunch`)
  return parts.join(' · ')
})
const detailPriceLine = computed(() => {
  const f = selected.value
  if (!f) return ''
  const parts: string[] = []
  if (f.pricePerStem != null) parts.push(`${formatPence(f.pricePerStem)}/stem`)
  const b = bunchPrice(f)
  if (b != null) parts.push(`${formatPence(b)}/bunch`)
  return parts.join(' · ')
})

// ── SEO / social sharing ──────────────────────────────────────────────────
// OG image must be an ABSOLUTE URL for link unfurlers. The DTO carries app-root
// /img paths; resolve them against this request's origin.
const requestUrl = useRequestURL()
const origin = computed(() => requestUrl.origin)
const ogImage = computed(() => {
  const rel = profile.value.bannerUrl || profile.value.avatarUrl
  return rel ? new URL(rel, origin.value).href : undefined
})
const pageDescription = computed(() => {
  const bio = profile.value.bio?.trim()
  if (bio) return bio.length > 160 ? `${bio.slice(0, 157)}…` : bio
  return `${profile.value.farmName} on Stems — the marketplace for local-grown flowers.`
})
const pageTitle = computed(() => `${profile.value.farmName} (@${profile.value.handle}) · Stems`)

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage,
  ogType: 'profile',
  ogUrl: () => `${origin.value}/@${profile.value.handle}`,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage
})

// JSON-LD for richer results (nice-to-have).
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': profile.value.isGrower ? 'LocalBusiness' : 'Person',
        name: profile.value.farmName,
        ...(profile.value.bio ? { description: profile.value.bio } : {}),
        ...(profile.value.locationName ? { address: profile.value.locationName } : {}),
        ...(ogImage.value ? { image: ogImage.value } : {}),
        url: `${origin.value}/@${profile.value.handle}`
      })
    }
  ]
}))
</script>

<template>
  <div>
    <!-- Hero: the grower's banner (or a soft blurred-floral wash) with the
         profile — avatar, name, handle/location — overlaid directly on it.
         Full-bleed to 100vw; a white scrim keeps the image light at the top and
         fades to the white canvas behind the text so dark type stays legible. -->
    <header class="relative mx-[calc(50%-50vw)] w-screen overflow-hidden">
      <img
        v-if="profile.bannerUrl"
        :src="profile.bannerUrl"
        :alt="`${profile.farmName} banner`"
        class="absolute inset-0 size-full object-cover"
      />
      <div
        v-else
        class="absolute inset-0 scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl"
        aria-hidden="true"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/25" aria-hidden="true" />

      <div
        class="relative mx-auto flex max-w-screen-sm flex-col items-center px-4 pb-7 pt-24 text-center sm:pt-28"
      >
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.farmName"
          class="size-24 rounded-full object-cover shadow-sm ring-4 ring-white sm:size-28"
        />
        <div
          v-else
          :class="tint"
          class="flex size-24 items-center justify-center rounded-full font-display text-3xl font-medium shadow-sm ring-4 ring-white sm:size-28"
          aria-hidden="true"
        >
          {{ initials }}
        </div>

        <h1 class="mt-3 font-display text-3xl font-medium leading-tight text-default sm:text-4xl">
          {{ profile.farmName }}
        </h1>
        <p class="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>@{{ profile.handle }}</span>
          <template v-if="profile.locationName">
            <span aria-hidden="true">·</span>
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              {{ profile.locationName }}
            </span>
          </template>
        </p>
      </div>
    </header>

    <!-- Body sits in the app layout's centered max-w-screen-sm column. -->
    <div>
      <!-- Bio, links + freshness — centered to continue from the hero -->
      <div class="flex flex-col items-center text-center">
        <p v-if="profile.bio" class="mt-5 max-w-prose whitespace-pre-line text-default">{{ profile.bio }}</p>

        <!-- Contact CTA — the primary action: reach the grower to buy. Wrapped so
             we can track when it scrolls off and surface the floating button. -->
        <div v-if="hasContact" ref="contactInlineRef" class="mt-5">
          <UButton
            color="primary"
            size="md"
            icon="i-lucide-message-circle"
            class="rounded-full px-5 font-medium"
            @click="openContact"
          >
            Contact to buy
          </UButton>
        </div>

        <!-- Links + share -->
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <UButton
            v-if="instagramUrl"
            :to="instagramUrl"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-instagram"
            class="rounded-full"
          >
            Instagram
          </UButton>
          <UButton
            v-if="websiteUrl"
            :to="websiteUrl"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-globe"
            class="rounded-full"
          >
            {{ websiteLabel }}
          </UButton>

          <ShareButton
            :handle="profile.handle"
            :farm-name="profile.farmName"
            color="neutral"
            variant="soft"
            size="sm"
            class="rounded-full"
          />
        </div>

        <p v-if="lastUpdated" class="mt-4 inline-flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-clock" class="size-3.5" />
          Updated {{ updatedAgo }}
        </p>
      </div>

      <!-- Non-grower: calm, box-free note + Browse growers CTA -->
      <div v-if="!profile.isGrower" class="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <UIcon name="i-lucide-sprout" class="size-7 text-dimmed" />
        <p class="font-display text-2xl font-medium text-default">Not listing flowers</p>
        <p class="max-w-xs text-sm text-muted">{{ profile.farmName }} isn't selling on Stems right now.</p>
        <UButton
          to="/discover"
          color="primary"
          variant="soft"
          class="mt-2 rounded-full px-5"
          icon="i-lucide-compass"
        >
          Browse growers
        </UButton>
      </div>

      <!-- Grower with zero flowers: friendly, box-free -->
      <div v-else-if="!flowers.length" class="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <UIcon name="i-lucide-flower-2" class="size-7 text-primary" />
        <p class="font-display text-2xl font-medium text-default">No blooms listed yet</p>
        <p class="max-w-xs text-sm text-muted">
          {{ profile.farmName }} hasn't added any flowers — check back soon.
        </p>
      </div>

      <!-- Availability: a borderless feed of flowers on hairline dividers. -->
      <section v-else class="mt-9">
        <div class="mb-1 flex items-baseline justify-between px-1">
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Availability</h2>
          <span v-if="inSeasonCount" class="inline-flex items-center gap-1.5 text-xs text-success">
            <span class="size-1.5 rounded-full bg-success" />
            <span class="font-medium">{{ inSeasonCount }} in season</span>
          </span>
        </div>

        <ul class="divide-y divide-default">
          <li v-for="flower in flowers" :key="flower.id">
            <button
              type="button"
              class="group flex w-full items-center gap-4 py-4 text-left transition-colors duration-200 hover:bg-clay-900/[0.015] focus:outline-none focus-visible:bg-clay-900/[0.025]"
              :class="{ 'opacity-60': isSoldOut(flower) }"
              :aria-label="`View ${flower.name} details`"
              @click="openDetail(flower)"
            >
              <!-- Portrait thumbnail -->
              <div class="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  v-if="flower.photoUrls[0]"
                  :src="flower.photoUrls[0]"
                  :alt="flower.name"
                  class="size-full object-cover"
                  loading="lazy"
                />
                <div v-else class="flex size-full items-center justify-center text-dimmed">
                  <UIcon name="i-lucide-flower-2" class="size-6" />
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <h3
                  class="truncate font-display text-xl font-medium leading-snug text-default transition-colors group-hover:text-primary"
                >
                  {{ flower.name }}
                </h3>
                <p v-if="subtitleFor(flower)" class="truncate text-sm text-muted">
                  {{ subtitleFor(flower) }}
                </p>

                <!-- Availability (plain text, not a badge) then price stack
                     vertically — they don't fit on one row. -->
                <p class="mt-1.5 text-sm text-muted">
                  Availability:
                  <span class="font-medium" :class="isSoldOut(flower) ? 'text-dimmed' : 'text-default'">
                    {{ availabilityText(flower) }}
                  </span>
                </p>

                <p v-if="priceLineFor(flower)" class="mt-0.5 truncate text-sm text-muted">
                  {{ priceLineFor(flower) }}
                </p>

                <span
                  v-if="flower.openToOffers"
                  class="mt-1.5 inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                >
                  Open to offers
                </span>

                <p
                  v-if="flower.notes"
                  class="mt-1 flex items-center gap-1.5 truncate text-sm italic text-dimmed"
                >
                  <UIcon name="i-lucide-sticky-note" class="size-3.5 shrink-0 not-italic" />
                  {{ flower.notes }}
                </p>

                <p class="mt-1 text-xs text-dimmed">Updated {{ timeAgo(flower.updatedAt) }}</p>
              </div>

              <UIcon
                name="i-lucide-arrow-up-right"
                class="size-4 shrink-0 text-dimmed opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100"
              />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- Read-only flower detail (page-managed; card's editable events are off) -->
    <!-- Title omitted: the serif name in the body leads (no duplicate header). -->
    <UDrawer v-model:open="detailOpen">
      <template #body>
        <div v-if="selected" class="mx-auto w-full max-w-md space-y-4">
          <!-- Keyed by flower id so the rail resets to the cover for each flower. -->
          <FlowerGallery :key="selected.id" :photos="selected.photoUrls" :alt="selected.name" />

          <div>
            <div>
              <h3 class="font-display text-2xl font-medium text-default">{{ selected.name }}</h3>
              <p v-if="detailSubtitle" class="text-sm text-muted">{{ detailSubtitle }}</p>
            </div>

            <!-- Availability reads exactly as it does in the listing. -->
            <p class="mt-2 text-sm text-muted">
              Availability:
              <span class="font-medium" :class="isSoldOut(selected) ? 'text-dimmed' : 'text-default'">
                {{ availabilityText(selected) }}
              </span>
            </p>

            <p v-if="detailPriceLine" class="mt-3 text-lg font-medium text-default">{{ detailPriceLine }}</p>
            <span
              v-if="selected.openToOffers"
              class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
            >
              <UIcon name="i-lucide-tag" class="size-3.5" />
              Open to offers
            </span>
            <p v-if="detailMeta" class="mt-1 text-sm text-muted">{{ detailMeta }}</p>
            <p class="mt-1 text-xs text-dimmed">Updated {{ timeAgo(selected.updatedAt) }}</p>

            <div v-if="selected.notes" class="mt-4">
              <h4 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Notes</h4>
              <p class="mt-1.5 whitespace-pre-line text-sm text-default">{{ selected.notes }}</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Buy CTA, scoped to the flower being viewed. -->
      <template v-if="hasContact" #footer>
        <UButton
          color="primary"
          size="lg"
          block
          icon="i-lucide-message-circle"
          class="font-medium"
          @click="openContact"
        >
          Contact to buy
        </UButton>
      </template>
    </UDrawer>

    <!-- Floating "Contact to buy": hovers above the bottom nav once the inline
         hero CTA scrolls out of view. Centered, primary, pill-shaped, with a gap
         above the nav so the two don't touch. -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="showFloatingContact"
        class="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 flex justify-center px-4"
      >
        <UButton
          color="primary"
          size="lg"
          icon="i-lucide-message-circle"
          class="rounded-full px-7 font-medium shadow-lg shadow-primary/25"
          @click="openContact"
        >
          Contact to buy
        </UButton>
      </div>
    </Transition>

    <!-- Single shared contact sheet, opened from the header or a flower drawer. -->
    <ContactSheet v-if="hasContact" v-model:open="contactOpen" :profile="profile" />
  </div>
</template>
