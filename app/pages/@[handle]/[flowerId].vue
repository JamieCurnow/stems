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
import {
  availabilityStatusLabel,
  availabilityStatusMeta,
  isSoldOut,
  stemsCountLabel
} from '~~/shared/utils/flowers'
import { timeAgo } from '~~/shared/utils/time'
import { avatarInitials, avatarTint } from '~~/shared/utils/avatar'
import { bunchPrice, formatPence } from '~~/shared/utils/price'
import { contactOptions } from '~~/shared/utils/contact'
import { authClient } from '~/utils/auth-client'
import type { PublicProfileDto } from '~~/shared/types/profile'
import type { FlowerDto } from '~~/shared/types/flower'

// This view has its own sticky Contact bar, so it hides the floating tab bar and
// carries a slim desktop top-bar nav instead (see template).
definePageMeta({ layout: 'app', hideTabBar: true })

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

// ── Availability ──────────────────────────────────────────────────────────
// Two independent signals (a categorical status and an exact stem count), both
// optional. Render via the shared helpers — don't re-derive the string logic.
const soldOut = computed(() => (flower.value ? isSoldOut(flower.value) : false))
// Status chip: shown when a status is set (sold-out gets its own neutral chip
// below, so it's excluded here to avoid a duplicate).
const statusChip = computed(() => {
  const f = flower.value
  if (!f || soldOut.value || !f.availabilityStatus) return null
  const label = availabilityStatusLabel(f.availabilityStatus)
  if (!label) return null
  return { label, ...chipColours(availabilityStatusMeta(f.availabilityStatus)?.color) }
})
// Exact count ("90 stems"), only when a positive number was given.
const countLabel = computed(() => {
  const f = flower.value
  if (!f || soldOut.value || f.stemsAvailable == null || f.stemsAvailable <= 0) return null
  return stemsCountLabel(f.stemsAvailable)
})

// Warm chip palette per semantic colour (design shows green for in-season;
// other statuses reuse the status's semantic colour).
function chipColours(color?: string) {
  switch (color) {
    case 'warning':
      return { bg: '#F7EEDD', text: '#9A6B2E', dot: '#C08A3E' }
    case 'error':
      return { bg: '#FBE9E7', text: '#C0503E', dot: '#D85C4B' }
    case 'info':
      return { bg: '#E7EEF3', text: '#5A7386', dot: '#67788A' }
    case 'neutral':
      return { bg: '#F1EEE8', text: '#847B6E', dot: '#A89F92' }
    default: // success / in-season
      return { bg: '#EAF1E7', text: '#5C7F5A', dot: '#5C7F5A' }
  }
}

// ── Price ─────────────────────────────────────────────────────────────────
// Prices are integer pence in the model — only format at render. Stem price is
// the emphasis; the bunch side is muted. Either can be absent.
const bunch = computed(() => (flower.value ? bunchPrice(flower.value) : null))
const hasPrice = computed(() => flower.value?.pricePerStem != null || bunch.value != null)
const hasFacts = computed(
  () => flower.value?.stemLengthCm != null || flower.value?.stemsPerBunch != null
)
// The price block also carries the offers chip + fact chips, so it shows if any
// of the three is present.
const showPriceBlock = computed(
  () => hasPrice.value || flower.value?.openToOffers || hasFacts.value
)
// Plain string kept for the SEO description only (see below).
const priceLine = computed(() => {
  const f = flower.value
  if (!f) return ''
  const parts: string[] = []
  if (f.pricePerStem != null) parts.push(`${formatPence(f.pricePerStem)}/stem`)
  if (bunch.value != null) parts.push(`${formatPence(bunch.value)}/bunch`)
  return parts.join(' · ')
})

// ── Seller card ─────────────────────────────────────────────────────────────
// Photo-less growers get the same warm tint + serif initials used everywhere.
const sellerTint = computed(() => avatarTint(profile.value.handle))
const sellerInitials = computed(() => avatarInitials(profile.value.farmName))

// Contact: only when the grower has given a way to reach them. Opens a sheet of
// deep links (no in-app messaging) — same component as the grower page.
const hasContact = computed(() => contactOptions(profile.value).length > 0)
const contactOpen = ref(false)

// The floating tab bar is hidden here, so the desktop top bar carries the global
// nav (Discover + Sign in) the mock shows. Auth resolves client-side, so gate
// the Sign in link on mount to avoid a hydration mismatch (mirrors AppTabBar).
const session = authClient.useSession()
const { profile: myProfile, ensure: ensureMyProfile } = useProfile()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
  ensureMyProfile()
})
const isAuthed = computed(() => mounted.value && !!session.value.data?.user)

// Owner affordance: if the signed-in user owns this flower (their handle matches
// the grower on this page), surface a quick shortcut to the flower editor.
const isOwner = computed(() => mounted.value && myProfile.value?.handle === profile.value.handle)

// ── SEO / social sharing ──────────────────────────────────────────────────
// OG image must be ABSOLUTE for link unfurlers; resolve the /img path against
// this request's origin.
const requestUrl = useRequestURL()
const origin = computed(() => requestUrl.origin)
const ogImage = computed(() => {
  const rel = flower.value?.photoUrls[0] || profile.value.avatarUrl
  return rel ? new URL(rel, origin.value).href : undefined
})
// Document <title> gets ' · Stems' from the global template (nuxt-seo-utils);
// ogTitle reuses this brandless value alongside the global ogSiteName.
const pageTitle = computed(() => `${flower.value?.name} · ${profile.value.farmName}`)
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
  <div v-if="flower">
    <!-- Sticky top bar: back to the grower's shop + share. Full-bleed translucent
         so it reads over the scrolling content (the app layout has no top chrome
         of its own). Back is a button (not a link) so it pops history and
         restores the list's scroll position; deep-links fall back to the grower
         page. -->
    <div
      class="sticky top-0 z-20 mx-[calc(50%-50vw)] w-screen border-b border-[#EDE9E2] bg-white/[0.86] backdrop-blur-[12px]"
    >
      <div class="mx-auto flex h-[54px] max-w-screen-sm items-center gap-2 px-4 lg:h-[62px] lg:max-w-[1180px] lg:px-10">
        <button
          type="button"
          class="-ml-1 flex min-w-0 items-center gap-1.5 rounded-[10px] py-2 pl-1 pr-2 text-[15px] font-medium text-[#4A453E] transition-colors hover:bg-[rgba(33,30,26,0.04)]"
          @click="goBack"
        >
          <UIcon name="i-lucide-chevron-left" class="size-5 shrink-0" />
          <span class="truncate">{{ profile.farmName }}</span>
        </button>
        <!-- Owner-only: quick jump to the flower editor. -->
        <NuxtLink
          v-if="isOwner"
          :to="{ path: `/flowers/${flower.id}/edit`, query: { backRoute: `/@${profile.handle}/${flower.id}` } }"
          class="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[rgba(33,30,26,0.05)] px-3.5 py-2 text-sm font-medium text-[#4A453E] transition-colors hover:bg-[rgba(33,30,26,0.09)] lg:ml-0"
        >
          <UIcon name="i-lucide-pencil" class="size-[15px]" />
          Edit
        </NuxtLink>
        <!-- Mobile: a quiet Share icon. -->
        <ShareButton
          square
          icon="i-lucide-share-2"
          color="neutral"
          variant="ghost"
          :handle="profile.handle"
          :farm-name="profile.farmName"
          :flower-id="flower.id"
          :flower-name="flower.name"
          class="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[#847B6E] hover:bg-[rgba(33,30,26,0.045)] lg:hidden"
          :class="isOwner ? 'ml-1' : 'ml-auto'"
        />

        <!-- Desktop: the global nav the floating tab bar carries elsewhere. -->
        <div class="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
          <NuxtLink
            to="/discover"
            class="flex items-center gap-2 rounded-full px-[18px] py-2.5 text-sm font-medium text-[#847B6E] transition-colors hover:bg-[rgba(33,30,26,0.04)]"
          >
            <UIcon name="i-lucide-search" class="size-[17px]" />
            Discover
          </NuxtLink>
          <NuxtLink
            v-if="!isAuthed"
            to="/login"
            class="rounded-full bg-peach-100 px-5 py-[11px] text-sm font-medium text-[#E87767] transition-colors hover:bg-[#fbded7]"
          >
            Sign in
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Body. Single scrolling column on mobile; at `lg` it breaks out of the
         app shell's narrow column into a two-column product layout (gallery |
         details), mirroring the desktop design. -->
    <div class="lg:mx-[calc(50%-50vw)] lg:w-screen">
      <div
        class="w-full pt-4 lg:mx-auto lg:grid lg:max-w-[1180px] lg:grid-cols-[560px_minmax(0,1fr)] lg:gap-[60px] lg:px-10 lg:pb-14 lg:pt-11"
        :class="hasContact ? 'pb-[140px] lg:pb-14' : 'pb-10'"
      >
        <!-- Gallery column. Keyed by id so the rail resets to the cover when
             switching flowers. -->
        <div>
          <FlowerGallery :key="flower.id" :photos="flower.photoUrls" :alt="flower.name" />
        </div>

        <!-- Details column. -->
        <div class="mt-5 lg:mt-0 lg:max-w-[460px]">
          <h1
            class="font-display text-[32px] font-medium leading-[1.02] tracking-[-0.01em] text-[#211E1A] lg:text-[46px] lg:tracking-[-0.015em]"
          >
            {{ flower.name }}
          </h1>
          <p v-if="subtitle" class="mt-[7px] text-[15px] leading-[1.4] text-[#847B6E] lg:mt-2.5 lg:text-[17px]">
            {{ subtitle }}
          </p>

          <!-- Availability: label + status chip and/or exact count. -->
          <div class="mt-5 flex flex-wrap items-center gap-x-[9px] gap-y-2 lg:mt-6 lg:gap-x-[11px]">
            <span class="text-sm text-[#847B6E] lg:text-[15px]">Availability:</span>
            <span
              v-if="soldOut"
              class="inline-flex items-center gap-2 rounded-full bg-[#F1EEE8] px-[13px] py-2 text-[13px] font-medium text-[#847B6E] lg:px-[15px] lg:py-[9px] lg:text-sm"
            >
              <span class="size-[7px] rounded-full bg-[#A89F92] lg:size-2" />
              Sold out
            </span>
            <span
              v-else-if="statusChip"
              class="inline-flex items-center gap-2 rounded-full px-[13px] py-2 text-[13px] font-medium lg:px-[15px] lg:py-[9px] lg:text-sm"
              :style="{ background: statusChip.bg, color: statusChip.text }"
            >
              <span class="size-[7px] rounded-full lg:size-2" :style="{ background: statusChip.dot }" />
              {{ statusChip.label }}
            </span>
            <span v-if="countLabel" class="text-sm font-medium text-[#4A453E] lg:text-[15px]">
              <span v-if="statusChip" class="text-[#D8D2C8]" aria-hidden="true">· </span>{{ countLabel }}
            </span>
            <!-- Nothing specific set → the neutral "Available" the helper falls back to. -->
            <span
              v-if="!soldOut && !statusChip && !countLabel"
              class="text-sm font-medium text-[#4A453E] lg:text-[15px]"
            >
              Available
            </span>
          </div>

          <!-- Price block: price line, offers chip, then fact chips. -->
          <div v-if="showPriceBlock" class="mt-5 border-t border-[#EDE9E2] pt-5 lg:mt-6 lg:pt-6">
            <div v-if="hasPrice" class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 lg:gap-x-3">
              <template v-if="flower.pricePerStem != null">
                <span
                  class="text-[30px] font-semibold leading-none tabular-nums text-[#211E1A] lg:text-[40px]"
                >
                  {{ formatPence(flower.pricePerStem) }}
                </span>
                <span class="text-[15px] text-[#847B6E] lg:text-[17px]">/ stem</span>
              </template>
              <span
                v-if="flower.pricePerStem != null && bunch != null"
                class="text-sm text-[#D8D2C8]"
                aria-hidden="true"
                >·</span
              >
              <template v-if="bunch != null">
                <span
                  class="text-[18px] font-medium leading-none tabular-nums text-[#211E1A] lg:text-[22px]"
                >
                  {{ formatPence(bunch) }}
                </span>
                <span class="text-[15px] text-[#847B6E] lg:text-[17px]">
                  / bunch<template v-if="flower.stemsPerBunch != null"> of {{ flower.stemsPerBunch }}</template>
                </span>
              </template>
            </div>

            <span
              v-if="flower.openToOffers"
              class="mt-[13px] inline-flex items-center gap-2 rounded-[11px] bg-[#EAF1E7] px-[13px] py-[9px] text-[13px] font-medium text-[#5C7F5A] lg:mt-4 lg:rounded-xl lg:px-[15px] lg:py-2.5 lg:text-sm"
            >
              <UIcon name="i-lucide-tag" class="size-[15px] lg:size-4" />
              Open to offers
            </span>

            <div v-if="hasFacts" class="mt-[15px] flex flex-wrap gap-2 lg:mt-[18px] lg:gap-[9px]">
              <span
                v-if="flower.stemLengthCm != null"
                class="inline-flex items-center rounded-[11px] bg-[#F5F2EC] px-[13px] py-[9px] text-[13px] font-medium text-[#4A453E] lg:rounded-xl lg:px-[15px] lg:py-2.5 lg:text-sm"
              >
                {{ flower.stemLengthCm }}cm stems
              </span>
              <span
                v-if="flower.stemsPerBunch != null"
                class="inline-flex items-center rounded-[11px] bg-[#F5F2EC] px-[13px] py-[9px] text-[13px] font-medium text-[#4A453E] lg:rounded-xl lg:px-[15px] lg:py-2.5 lg:text-sm"
              >
                {{ flower.stemsPerBunch }} per bunch
              </span>
            </div>
          </div>

          <!-- Grower's note. -->
          <div
            v-if="flower.notes"
            class="mt-5 rounded-[11px] border border-[#EDE9E2] bg-[#F7F4EF] px-[17px] py-[15px] lg:mt-6 lg:rounded-xl lg:px-[19px] lg:py-[17px]"
          >
            <p
              class="flex items-center gap-[7px] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A89F92] lg:gap-2"
            >
              <UIcon name="i-lucide-file-text" class="size-[13px] text-[#C08A3E] lg:size-3.5" />
              Note from the grower
            </p>
            <p
              class="mt-[9px] whitespace-pre-line text-sm leading-[1.5] text-[#4A453E] lg:mt-2.5 lg:text-[15px] lg:leading-[1.55]"
            >
              {{ flower.notes }}
            </p>
          </div>

          <!-- Contact CTA — the obvious next step. Desktop only; on mobile it
               lives in the sticky bottom bar below. Only when the grower gave a
               way to reach them. -->
          <button
            v-if="hasContact"
            type="button"
            class="mt-6 hidden w-full items-center justify-center gap-[9px] rounded-full bg-[#E87767] px-4 py-4 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(232,119,103,0.75)] transition-colors hover:bg-[#e06a59] lg:mt-[26px] lg:flex"
            @click="contactOpen = true"
          >
            <UIcon name="i-lucide-message-circle" class="size-[19px]" />
            Contact grower
          </button>

          <!-- Seller card — back to the grower's shop. -->
          <NuxtLink
            :to="growerUrl"
            class="mt-5 flex items-center gap-[13px] rounded-[11px] border border-[#E9E5DE] px-[15px] py-[13px] transition-colors hover:bg-[rgba(33,30,26,0.015)] lg:mt-[22px] lg:gap-3.5 lg:rounded-xl lg:px-4 lg:py-3.5"
          >
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.farmName"
              class="size-11 shrink-0 rounded-full object-cover lg:size-12"
            />
            <div
              v-else
              :class="sellerTint"
              class="flex size-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-medium lg:size-12"
              aria-hidden="true"
            >
              {{ sellerInitials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-medium leading-[1.2] text-[#211E1A] lg:text-base">
                {{ profile.farmName }}
              </p>
              <p
                v-if="profile.locationName"
                class="mt-[3px] flex items-center gap-[5px] text-xs leading-[1.2] text-[#847B6E] lg:mt-1 lg:text-[13px]"
              >
                <UIcon name="i-lucide-map-pin" class="size-[11px] shrink-0 text-[#A89F92] lg:size-3" />
                <span class="truncate">{{ profile.locationName }}</span>
              </p>
            </div>
            <span
              class="hidden shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#847B6E] lg:inline-flex"
            >
              View shop
              <UIcon name="i-lucide-chevron-right" class="size-4 text-[#CFC8BC]" />
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-[18px] shrink-0 text-[#CFC8BC] lg:hidden" />
          </NuxtLink>

          <p class="mt-[14px] text-xs text-[#A89F92]">Updated {{ timeAgo(flower.updatedAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Sticky Contact bar (mobile) — the floating tab bar is hidden on this
         view, so the buyer's next step is always in reach. Desktop shows Contact
         inline in the details column instead. -->
    <div
      v-if="hasContact"
      class="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(to_top,#fff_68%,rgba(255,255,255,0))] px-[18px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 lg:hidden"
    >
      <button
        type="button"
        class="flex w-full items-center justify-center gap-[9px] rounded-full bg-[#E87767] px-4 py-4 text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(232,119,103,0.7)] transition-colors hover:bg-[#e06a59]"
        @click="contactOpen = true"
      >
        <UIcon name="i-lucide-message-circle" class="size-[19px]" />
        Contact grower
      </button>
    </div>

    <ContactSheet v-if="hasContact" v-model:open="contactOpen" :profile="profile" />
  </div>
</template>
