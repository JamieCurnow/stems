<script setup lang="ts">
// Horizontally swipeable image gallery for the read-only flower detail page. A
// flower can carry several photos (square crops), so the cover image alone isn't
// enough.
//
// We lean on the browser's own gesture arbitration: a native scroll-snap rail
// with `touch-action: pan-x`. The browser owns horizontal panning (buttery
// snap); every other axis (i.e. vertical) is left untouched, so a vertical drag
// scrolls the page as normal. No JS carousel, no pointer-capture fights.
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
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-muted">
    <!-- Native horizontal snap rail. `touch-pan-x` hands horizontal gestures to
         the browser (snap) and leaves vertical ones for the drawer's drag-to-
         close. Scrollbar hidden; we navigate by swipe + dots. -->
    <div
      ref="rail"
      class="flex aspect-square max-h-[46vh] touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      <div v-else class="flex size-full shrink-0 items-center justify-center text-dimmed">
        <UIcon name="i-lucide-flower-2" class="size-12" />
      </div>
    </div>

    <!-- Soft scrim so the white dots stay legible over light photos. -->
    <div
      v-if="hasMany"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent"
      aria-hidden="true"
    />

    <!-- Position dots — tappable on desktop, indicative on touch. -->
    <div v-if="hasMany" class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
      <button
        v-for="(_, i) in photos"
        :key="i"
        type="button"
        class="pointer-events-auto h-2 rounded-full shadow-sm transition-all duration-200"
        :class="i === active ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'"
        :aria-label="`Show photo ${i + 1} of ${photos.length}`"
        :aria-current="i === active ? 'true' : undefined"
        @click="go(i)"
      />
    </div>
  </div>
</template>
