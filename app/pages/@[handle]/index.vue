<script setup lang="ts">
// Public, logged-out grower page at /@handle — the shareable wedge (doc 08).
// SSR-rendered so WhatsApp/iMessage/Instagram link previews resolve, and so the
// availability list is in the first paint. Uses the `app` layout (floating
// bottom nav) so navigation is consistent with the rest of the app — the tab
// bar already handles the logged-out case (Discover + Sign in). The availability
// feed is a borderless Toast × Instagram feed with two view modes — a
// detail-dense List and a photo-forward Grid — toggled by a segmented control.
import { useLocalStorage, useTimeAgo } from '@vueuse/core'
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

// Owner affordance: if the signed-in user is viewing their own public page, show
// a quiet settings shortcut to the profile editor. Auth/profile resolve
// client-side, so gate on `mounted` to avoid a hydration mismatch (mirrors the
// flower page and AppTabBar).
const { profile: myProfile, ensure: ensureMyProfile } = useProfile()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
  ensureMyProfile()
})
const isOwner = computed(() => mounted.value && myProfile.value?.handle === profile.value.handle)

// Photo-less avatar: warm, deterministic tint keyed off the handle + serif
// initials — the same treatment as the discovery feed (Grower/Card.vue) so a
// grower looks consistent wherever they appear.
const tint = computed(() => avatarTint(profile.value.handle))
const initials = computed(() => avatarInitials(profile.value.farmName))

// "● N in season" — anything in stock right now (not sold out by count or status).
const inSeasonCount = computed(() => flowers.value.filter((f) => !isSoldOut(f)).length)

// Feed view mode — the key interaction. View-local UI state, defaulting to Grid;
// persisted so a returning buyer keeps their preference. useLocalStorage is
// SSR-safe (returns the default on the server), and the default matches the
// initial client render, so there's no hydration flash.
const view = useLocalStorage<'list' | 'grid'>('stems:listing-view', 'grid')

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

// Grid status chip: the short availability word (first segment) + a dot that
// goes amber for "Limited"/"Very limited" and green otherwise.
function statusShort(f: FlowerDto) {
  return availabilityText(f).split(' · ')[0]
}
function statusIsLimited(f: FlowerDto) {
  return /limited/i.test(availabilityText(f))
}

// Warm, deterministic tile for photo-less flowers in grid mode — the same tint
// language as the app's avatar fallbacks, so a sparse mixed grid still reads as
// intentional rather than broken. Keyed off the flower name; needs an explicit
// ink hex (for the SVG glyph) so it's kept local rather than reusing the
// class-returning avatarTint helper.
const GRID_TINTS = [
  { bg: '#EFE6DA', ink: '#A9874F' },
  { bg: '#E7EBDF', ink: '#6E7B58' },
  { bg: '#F3E4DD', ink: '#B5715E' },
  { bg: '#E4E8EC', ink: '#67788A' },
  { bg: '#EFE4EB', ink: '#8E6E86' },
  { bg: '#F1E9D6', ink: '#9C8444' }
] as const
function gridTint(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return GRID_TINTS[hash % GRID_TINTS.length]!
}

const websiteUrl = computed(() => {
  const w = profile.value.website
  if (!w) return null
  return /^https?:\/\//i.test(w) ? w : `https://${w}`
})
const instagramUrl = computed(() =>
  profile.value.instagram ? `https://instagram.com/${profile.value.instagram}` : null
)

// "Contact" — only shown when the grower has given at least one way to reach
// them. Opens a sheet of deep links (no in-app messaging).
const hasContact = computed(() => contactOptions(profile.value).length > 0)
const contactOpen = ref(false)
function openContact() {
  contactOpen.value = true
}

// "Updated X ago" — from the most recently edited visible flower. Omitted when
// there are no flowers (nothing to signal freshness about).
const lastUpdated = computed(() => {
  if (!flowers.value.length) return null
  return Math.max(...flowers.value.map((f) => f.updatedAt))
})
const updatedAgo = useTimeAgo(() => lastUpdated.value ?? Date.now())

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
  return `${profile.value.farmName} on Stems - the marketplace for local-grown flowers.`
})
// The global title template (nuxt-seo-utils) appends ' · Stems' to the document
// <title>; ogTitle reuses this brandless value and pairs with the global
// ogSiteName: 'Stems', so the brand isn't doubled on either surface.
const pageTitle = computed(() => `${profile.value.farmName} (@${profile.value.handle})`)

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
    <!-- Hero: full-bleed banner that fades to white behind the profile. A white
         scrim keeps the image light at the top and fades fully to the canvas
         before the name, so dark type stays legible. -->
    <header class="relative mx-[calc(50%-50vw)] w-screen overflow-hidden">
      <!-- Back to the discovery feed. Frosted circle floating top-left over the
           banner, mirroring the owner settings shortcut. -->
      <NuxtLink
        to="/discover"
        aria-label="Back to discover"
        class="absolute left-4 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex size-10 items-center justify-center rounded-full bg-white/[0.86] text-[#4A453E] shadow-[0_2px_8px_-2px_rgba(33,30,26,0.25)] backdrop-blur-[6px] transition-colors hover:bg-white sm:size-11"
      >
        <UIcon name="i-lucide-arrow-left" class="size-[18px] sm:size-5" />
      </NuxtLink>
      <!-- Owner-only: quick jump to the profile editor. Frosted circle floating
           top-right over the banner. -->
      <NuxtLink
        v-if="isOwner"
        :to="{ path: '/account/edit', query: { backRoute: `/@${profile.handle}` } }"
        aria-label="Edit profile"
        class="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex size-10 items-center justify-center rounded-full bg-white/[0.86] text-[#4A453E] shadow-[0_2px_8px_-2px_rgba(33,30,26,0.25)] backdrop-blur-[6px] transition-colors hover:bg-white sm:size-11"
      >
        <UIcon name="i-lucide-settings" class="size-[18px] sm:size-5" />
      </NuxtLink>
      <img
        v-if="profile.bannerUrl"
        :src="profile.bannerUrl"
        :alt="`${profile.farmName} banner`"
        class="absolute inset-x-0 top-0 h-[230px] w-full object-cover sm:h-[320px]"
      />
      <div
        v-else
        class="absolute inset-x-0 top-0 h-[230px] scale-110 bg-[url('/hero-flowers.svg')] bg-cover bg-center blur-xl sm:h-[320px]"
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        class="absolute inset-x-0 top-0 h-[270px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.55)_34%,#fff_58%)] sm:h-[420px] sm:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.5)_32%,#fff_56%)]"
      />

      <div
        class="relative mx-auto flex max-w-screen-sm flex-col items-center px-[26px] pb-1.5 pt-[120px] text-center sm:px-6 sm:pt-[150px]"
      >
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.farmName"
          class="size-[92px] rounded-full object-cover shadow-[0_6px_18px_-8px_rgba(33,30,26,0.4)] outline outline-4 outline-white sm:size-[120px] sm:shadow-[0_8px_24px_-10px_rgba(33,30,26,0.45)] sm:outline-[5px]"
        />
        <div
          v-else
          :class="tint"
          class="flex size-[92px] items-center justify-center rounded-full font-display text-3xl font-medium shadow-[0_6px_18px_-8px_rgba(33,30,26,0.4)] outline outline-4 outline-white sm:size-[120px] sm:text-4xl sm:shadow-[0_8px_24px_-10px_rgba(33,30,26,0.45)] sm:outline-[5px]"
          aria-hidden="true"
        >
          {{ initials }}
        </div>

        <p
          v-if="profile.tagline"
          class="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#E87767] sm:mt-[18px] sm:text-[11px] sm:tracking-[0.3em]"
        >
          {{ profile.tagline }}
        </p>
        <h1
          class="font-display text-[31px] font-medium leading-[1.05] tracking-[-0.01em] text-default sm:text-[44px] sm:leading-[1.02]"
          :class="profile.tagline ? 'mt-[7px] sm:mt-[9px]' : 'mt-3.5 sm:mt-[18px]'"
        >
          {{ profile.farmName }}
        </h1>
        <p
          class="mt-[9px] flex flex-wrap items-center justify-center gap-x-[7px] gap-y-1 text-sm text-[#847B6E] sm:mt-3 sm:gap-x-[9px] sm:text-base"
        >
          <span class="text-[#A89F92]">@{{ profile.handle }}</span>
          <template v-if="profile.locationName">
            <span class="text-[#D8D2C8]" aria-hidden="true">·</span>
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-[#A89F92]" />
              {{ profile.locationName }}
            </span>
          </template>
        </p>
      </div>
    </header>

    <!-- Body sits in the app layout's centered max-w-screen-sm column. -->
    <div>
      <!-- Bio + action row — centered, continuing from the hero. -->
      <div class="flex flex-col items-center text-center">
        <p
          v-if="profile.bio"
          class="mt-[14px] max-w-[30ch] whitespace-pre-line text-[15px] leading-[1.5] text-[#4A453E] sm:mt-[18px] sm:max-w-[46ch] sm:text-base sm:leading-[1.55]"
        >
          {{ profile.bio }}
        </p>

        <!-- Action row: primary Contact + quiet secondary icon buttons. -->
        <div class="mt-5 flex items-center justify-center gap-2.5 sm:mt-[22px] sm:gap-[11px]">
          <button
            v-if="hasContact"
            type="button"
            class="inline-flex items-center gap-[9px] rounded-full bg-peach-100 px-7 py-[14px] text-[15px] font-medium text-[#E87767] transition-colors hover:bg-[#fbded7] sm:gap-2.5 sm:px-8 sm:py-[15px] sm:text-base"
            @click="openContact"
          >
            <UIcon name="i-lucide-message-circle" class="size-[18px]" />
            Contact
          </button>

          <a
            v-if="instagramUrl"
            :href="instagramUrl"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            class="flex size-[46px] items-center justify-center rounded-full border border-[#E2DDD4] text-[#847B6E] transition-colors hover:bg-[rgba(33,30,26,0.035)] sm:size-[50px]"
          >
            <UIcon name="i-lucide-instagram" class="size-[18px] sm:size-[19px]" />
          </a>

          <a
            v-if="websiteUrl"
            :href="websiteUrl"
            target="_blank"
            rel="noopener"
            aria-label="Website"
            class="flex size-[46px] items-center justify-center rounded-full border border-[#E2DDD4] text-[#847B6E] transition-colors hover:bg-[rgba(33,30,26,0.035)] sm:size-[50px]"
          >
            <UIcon name="i-lucide-globe" class="size-[18px] sm:size-[19px]" />
          </a>

          <ShareButton
            square
            icon="i-lucide-share-2"
            color="neutral"
            variant="ghost"
            :handle="profile.handle"
            :farm-name="profile.farmName"
            class="flex size-[46px] items-center justify-center rounded-full border border-[#E2DDD4] text-[#847B6E] hover:bg-[rgba(33,30,26,0.035)] sm:size-[50px]"
          />
        </div>
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
          {{ profile.farmName }} hasn't added any flowers - check back soon.
        </p>
      </div>

      <!-- Availability: header (label + freshness sub-line + List/Grid switcher)
           then the feed in the selected view mode. -->
      <section v-else class="mt-8">
        <div class="mb-1 flex items-center justify-between px-0.5">
          <div>
            <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#847B6E]">Availability</h2>
            <p class="mt-2 flex items-center gap-1.5 text-[11px] text-[#A89F92] sm:text-xs">
              <template v-if="inSeasonCount">
                <span class="size-1.5 rounded-full bg-[#5C7F5A]" />
                <span class="font-medium text-[#5C7F5A]">{{ inSeasonCount }} in season</span>
                <span v-if="lastUpdated" aria-hidden="true">·</span>
              </template>
              <span v-if="lastUpdated">Updated {{ updatedAgo }}</span>
            </p>
          </div>

          <!-- List / Grid segmented switcher. Active pill tracks `view`. -->
          <div class="inline-flex shrink-0 rounded-full bg-[#F1EEE8] p-[3px]">
            <button
              type="button"
              aria-label="List view"
              :aria-pressed="view === 'list'"
              class="flex h-[30px] w-9 items-center justify-center rounded-full transition-[background,box-shadow] duration-150"
              :class="
                view === 'list'
                  ? 'bg-white text-[#211E1A] shadow-[0_1px_3px_rgba(33,30,26,0.18)]'
                  : 'bg-transparent text-[#A89F92]'
              "
              @click="view = 'list'"
            >
              <UIcon name="i-lucide-list" class="size-4" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              :aria-pressed="view === 'grid'"
              class="flex h-[30px] w-9 items-center justify-center rounded-full transition-[background,box-shadow] duration-150"
              :class="
                view === 'grid'
                  ? 'bg-white text-[#211E1A] shadow-[0_1px_3px_rgba(33,30,26,0.18)]'
                  : 'bg-transparent text-[#A89F92]'
              "
              @click="view = 'grid'"
            >
              <UIcon name="i-lucide-grid-2x2" class="size-4" />
            </button>
          </div>
        </div>

        <!-- List mode: borderless, detail-dense rows on hairline dividers. -->
        <ul v-if="view === 'list'" class="mt-1">
          <li v-for="flower in flowers" :key="flower.id">
            <NuxtLink
              :to="`/@${profile.handle}/${flower.id}`"
              class="group -mx-2.5 flex items-start gap-[14px] border-b border-[#EDE9E2] px-2.5 py-4 text-left transition-colors hover:bg-[rgba(33,30,26,0.016)] focus:outline-none focus-visible:bg-[rgba(33,30,26,0.025)] sm:gap-[18px] sm:py-[18px]"
              :class="{ 'opacity-60': isSoldOut(flower) }"
              :aria-label="`View ${flower.name} details`"
            >
              <!-- Portrait thumbnail (or placeholder) -->
              <div
                class="h-[112px] w-[90px] shrink-0 overflow-hidden rounded-lg bg-[#ECE8E2] sm:h-[132px] sm:w-[106px] sm:rounded-[10px]"
                :class="{ 'bg-[#F1EEE8]': !flower.photoUrls[0] }"
              >
                <img
                  v-if="flower.photoUrls[0]"
                  :src="flower.photoUrls[0]"
                  :alt="flower.name"
                  class="size-full object-cover"
                  loading="lazy"
                />
                <div v-else class="flex size-full items-center justify-center text-[#CFC8BC]">
                  <UIcon name="i-lucide-flower-2" class="size-6" />
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <h3
                  class="font-display text-[19px] font-medium leading-[1.15] text-default transition-colors group-hover:text-primary sm:text-[22px] sm:leading-[1.12]"
                >
                  {{ flower.name }}
                </h3>
                <p
                  v-if="subtitleFor(flower)"
                  class="mt-0.5 truncate text-[13px] leading-[1.35] text-[#847B6E] sm:text-sm"
                >
                  {{ subtitleFor(flower) }}
                </p>

                <p class="mt-1.5 text-[13px] text-[#847B6E] sm:mt-2 sm:text-sm">
                  Availability:
                  <span class="font-semibold" :class="isSoldOut(flower) ? 'text-dimmed' : 'text-[#211E1A]'">
                    {{ availabilityText(flower) }}
                  </span>
                </p>

                <p
                  v-if="priceLineFor(flower)"
                  class="mt-[3px] truncate text-[13px] tabular-nums text-[#847B6E] sm:mt-1 sm:text-sm"
                >
                  {{ priceLineFor(flower) }}
                </p>

                <span
                  v-if="flower.openToOffers"
                  class="mt-[7px] inline-flex items-center rounded-full bg-[#EAF1E7] px-2.5 py-[5px] text-[11px] font-medium text-[#5C7F5A] sm:px-[11px] sm:py-1.5 sm:text-xs"
                >
                  Open to offers
                </span>

                <p
                  v-if="flower.notes"
                  class="mt-2 flex items-start gap-1.5 text-[13px] italic leading-[1.4] text-[#A89F92] sm:mt-[9px] sm:text-sm"
                >
                  <UIcon name="i-lucide-sticky-note" class="mt-0.5 size-3.5 shrink-0 not-italic text-[#CFC8BC]" />
                  <span>{{ flower.notes }}</span>
                </p>

                <p class="mt-[7px] text-[11px] text-[#BBB2A4] sm:mt-2 sm:text-xs">
                  Updated {{ timeAgo(flower.updatedAt) }}
                </p>
              </div>

              <!-- Desktop-only affordance arrow -->
              <UIcon
                name="i-lucide-arrow-up-right"
                class="mt-1 hidden size-4 shrink-0 text-[#CFC8BC] transition-all group-hover:translate-x-0.5 group-hover:text-primary sm:block"
              />
            </NuxtLink>
          </li>
        </ul>

        <!-- Grid mode: 2-up (mobile) / 3-up (desktop) photo-forward gallery. -->
        <div v-else class="mt-1 grid grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7">
          <NuxtLink
            v-for="flower in flowers"
            :key="flower.id"
            :to="`/@${profile.handle}/${flower.id}`"
            class="group flex min-w-0 flex-col text-left"
            :class="{ 'opacity-60': isSoldOut(flower) }"
            :aria-label="`View ${flower.name} details`"
          >
            <!-- Media: photo, or a warm deterministic tile with a flower glyph. -->
            <div
              class="relative aspect-[1/1.15] w-full overflow-hidden rounded-[14px]"
              :style="{ background: flower.photoUrls[0] ? '#ECE8E2' : gridTint(flower.name).bg }"
            >
              <img
                v-if="flower.photoUrls[0]"
                :src="flower.photoUrls[0]"
                :alt="flower.name"
                class="size-full object-cover"
                loading="lazy"
              />
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <UIcon
                  name="i-lucide-flower-2"
                  class="size-11"
                  :style="{ color: gridTint(flower.name).ink, opacity: 0.7 }"
                />
              </div>

              <!-- Frosted status chip, top-left. -->
              <span
                class="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.92] px-[9px] py-1 text-[11px] font-medium text-[#4A453E] shadow-[0_1px_3px_rgba(33,30,26,0.12)] backdrop-blur-[4px]"
              >
                <span
                  class="size-1.5 rounded-full"
                  :class="statusIsLimited(flower) ? 'bg-[#C08A3E]' : 'bg-[#5C7F5A]'"
                />
                {{ statusShort(flower) }}
              </span>
            </div>

            <h3
              class="mt-[9px] font-display text-[17px] font-medium leading-[1.12] text-default transition-colors group-hover:text-primary sm:mt-[11px] sm:text-[19px] sm:leading-[1.1]"
            >
              {{ flower.name }}
            </h3>
            <p
              v-if="subtitleFor(flower)"
              class="mt-0.5 truncate text-[12px] leading-[1.3] text-[#A89F92] sm:mt-[3px] sm:leading-[1.35]"
            >
              {{ subtitleFor(flower) }}
            </p>

            <div class="mt-1.5 flex flex-wrap items-center gap-2 sm:mt-2">
              <span v-if="priceLineFor(flower)" class="text-[13px] font-medium tabular-nums text-[#211E1A]">
                {{ priceLineFor(flower) }}
              </span>
              <span
                v-if="flower.openToOffers"
                class="inline-flex items-center whitespace-nowrap rounded-full bg-[#EAF1E7] px-2 py-1 text-[10px] font-medium text-[#5C7F5A]"
              >
                Open to offers
              </span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>

    <!-- Single shared contact sheet, opened from the header CTA. -->
    <ContactSheet v-if="hasContact" v-model:open="contactOpen" :profile="profile" />
  </div>
</template>
