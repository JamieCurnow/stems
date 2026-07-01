<script setup lang="ts">
// Image gallery for the read-only flower detail page. A flower can carry several
// photos, so the cover alone isn't enough.
//
// We lean on the browser's own gesture arbitration: a native scroll-snap rail
// with `touch-action: pan-x`. The browser owns horizontal panning (buttery
// snap); every other axis (i.e. vertical) is left untouched, so a vertical drag
// scrolls the page as normal. No JS carousel, no pointer-capture fights. On top
// of the rail we layer buyer-facing affordances: a photo-count chip, prev/next
// arrows and position dots — all hidden for a single photo, where the lone
// image is all there is to see.
const props = defineProps<{
  /** Resolved /img URLs, cover first. */
  photos: string[]
  /** Alt text (the flower name). */
  alt: string
}>()

const rail = ref<HTMLElement | null>(null)
const active = ref(0)

const hasMany = computed(() => props.photos.length > 1)

// Derive the active slide from the scroll offset (one slide = one viewport
// width). Ratio-based, so it survives resize/rotation without re-measuring.
function onScroll() {
  const el = rail.value
  if (!el || el.clientWidth === 0) return
  active.value = Math.round(el.scrollLeft / el.clientWidth)
}

function go(index: number) {
  const el = rail.value
  if (!el) return
  el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
}

// Arrows wrap around the ends (last → first, first → last).
function step(delta: number) {
  const n = props.photos.length
  if (!n) return
  go((active.value + delta + n) % n)
}
</script>

<template>
  <div>
    <div
      class="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#ECE8E2] lg:aspect-square lg:rounded-[22px]"
    >
      <!-- Native horizontal snap rail. `touch-pan-x touch-pan-y` (→ `touch-action:
           pan-x pan-y`) lets the browser route a horizontal drag to this rail
           (snap between photos) and a vertical drag to the page (scroll on) — so
           the gallery never traps vertical scrolling. Scrollbar hidden; we
           navigate by swipe + arrows + dots. -->
      <div
        ref="rail"
        class="flex size-full touch-pan-x touch-pan-y snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        @scroll.passive="onScroll"
      >
        <template v-if="photos.length">
          <div v-for="(url, i) in photos" :key="i" class="size-full shrink-0 snap-center snap-always">
            <img
              :src="url"
              :alt="alt"
              class="size-full object-cover"
              :loading="i === 0 ? 'eager' : 'lazy'"
              draggable="false"
            />
          </div>
        </template>
        <div v-else class="flex size-full shrink-0 items-center justify-center text-[#CFC8BC]">
          <UIcon name="i-lucide-flower-2" class="size-12" />
        </div>
      </div>

      <!-- Photo-count chip (top-right) — frosted dark pill. -->
      <div
        v-if="hasMany"
        class="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(28,26,23,0.55)] px-[9px] py-[5px] text-[11px] font-medium text-white backdrop-blur-[4px] lg:right-4 lg:top-4 lg:px-[11px] lg:py-1.5 lg:text-xs"
      >
        <UIcon name="i-lucide-image" class="size-3 lg:size-3.5" />
        {{ active + 1 }} / {{ photos.length }}
      </div>

      <!-- Prev / next arrows — frosted white circles, solid on hover. -->
      <template v-if="hasMany">
        <button
          type="button"
          aria-label="Previous photo"
          class="absolute left-2.5 top-1/2 flex size-[34px] -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.82] text-[#4A453E] shadow-[0_2px_8px_rgba(33,30,26,0.16)] backdrop-blur-[4px] transition-colors hover:bg-white lg:left-3.5 lg:size-10 lg:shadow-[0_3px_10px_rgba(33,30,26,0.18)]"
          @click="step(-1)"
        >
          <UIcon name="i-lucide-chevron-left" class="size-[18px] lg:size-5" />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          class="absolute right-2.5 top-1/2 flex size-[34px] -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.82] text-[#4A453E] shadow-[0_2px_8px_rgba(33,30,26,0.16)] backdrop-blur-[4px] transition-colors hover:bg-white lg:right-3.5 lg:size-10 lg:shadow-[0_3px_10px_rgba(33,30,26,0.18)]"
          @click="step(1)"
        >
          <UIcon name="i-lucide-chevron-right" class="size-[18px] lg:size-5" />
        </button>
      </template>

      <!-- Position dots (mobile) — indicative on touch, tappable everywhere. -->
      <!-- Position dots — indicative + tappable. The count chip and arrows make
           it obvious there's more than one photo, so no thumbnail rail. -->
      <div v-if="hasMany" class="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:bottom-4">
        <button
          v-for="(_, i) in photos"
          :key="i"
          type="button"
          class="size-[7px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-colors"
          :class="i === active ? 'bg-white' : 'bg-white/50 hover:bg-white/80'"
          :aria-label="`Show photo ${i + 1} of ${photos.length}`"
          :aria-current="i === active ? 'true' : undefined"
          @click="go(i)"
        />
      </div>
    </div>
  </div>
</template>
