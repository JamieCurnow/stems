<script setup lang="ts">
// Presentational phone mockup for the marketing landing (`/`). Mirrors the live
// grower page (app/pages/@[handle]/index.vue) 1:1 so it reads as authentic, but
// it is a static illustration — never wired to live data. Sizing scales up at
// `lg` (≥1024px) per the desktop handoff: 272px device / 498px screen / 4 rows
// on mobile, 300px / 600px / 5 rows on desktop (Phlox is the lg-only fifth row).
// Banner, avatar + flower photos are real assets in public/phoneMock (filenames
// carry spaces, so they're referenced URL-encoded).
const banner = '/phoneMock/banner.jpg'
const avatar = '/phoneMock/profile.jpg'

const mockFlowers = [
  {
    name: 'Icelandic poppies',
    meta: 'Peach, white · 40cm',
    availability: 'Good',
    price: '£1.00',
    photo: '/phoneMock/Icelandic%20poppies.jpg'
  },
  {
    name: 'Sweet peas',
    meta: 'Scented mix · 30cm',
    availability: 'Limited',
    price: '£0.50',
    photo: '/phoneMock/Sweet%20peas.jpg'
  },
  {
    name: 'Cosmos',
    meta: 'Double cranberry · 60cm',
    availability: 'Limited',
    price: '£0.80',
    photo: '/phoneMock/Cosmos.jpg'
  },
  {
    name: 'Cornflower',
    meta: 'Blue · 50cm',
    availability: 'Available',
    price: '£0.30',
    photo: '/phoneMock/Cornflower.jpg'
  },
  {
    name: 'Phlox',
    meta: 'Crème caramel · 60cm',
    availability: 'Good',
    price: '£0.85',
    photo: '/phoneMock/Phlox.jpg',
    lgOnly: true
  }
]

// Subtle fade-in-and-up the first time the mockup scrolls into view. One-shot:
// once visible we stop observing so it never re-triggers on scroll-back.
const root = ref<HTMLElement | null>(null)
const shown = ref(false)
const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (entry?.isIntersecting) {
      shown.value = true
      stop()
    }
  },
  { threshold: 0.15 }
)
</script>

<template>
  <div
    ref="root"
    class="w-[272px] rounded-[42px] bg-[#1c1a17] p-[7px] shadow-[0_26px_52px_-22px_rgba(33,30,26,0.5),0_8px_18px_rgba(33,30,26,0.18)] transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none lg:w-[300px] lg:rounded-[46px] lg:p-[8px] lg:shadow-[0_34px_64px_-26px_rgba(33,30,26,0.5),0_10px_22px_rgba(33,30,26,0.18)]"
    :class="
      shown
        ? 'translate-y-0 opacity-100'
        : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
    "
  >
    <div
      class="relative h-[498px] overflow-hidden rounded-[34px] bg-white text-left lg:h-[600px] lg:rounded-[38px]"
    >
      <!-- Notch pill -->
      <div
        class="absolute left-1/2 top-[9px] z-10 h-[6px] w-[76px] -translate-x-1/2 rounded-full bg-white/70 lg:top-[11px] lg:w-[84px]"
        aria-hidden="true"
      />
      <!-- Banner (white scrim fades it to white at the bottom, matching the
           live grower page header). -->
      <div class="relative h-[98px] lg:h-[110px]">
        <img :src="banner" alt="" aria-hidden="true" class="size-full object-cover" />
        <div
          class="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/25"
          aria-hidden="true"
        />
      </div>
      <!-- Identity (relative z-10 keeps the avatar above the positioned banner) -->
      <div class="relative z-10 px-3.5 text-center lg:px-4">
        <img
          :src="avatar"
          alt=""
          aria-hidden="true"
          class="-mt-[29px] mx-auto size-[58px] rounded-full border-[3px] border-white object-cover shadow-[0_2px_6px_rgba(33,30,26,0.14)] lg:-mt-[32px] lg:size-[64px]"
        />
        <h3
          class="mt-2 font-display text-[17px] font-medium leading-tight text-default lg:mt-[9px] lg:text-[19px]"
        >
          Juliette Florence Flowers
        </h3>
        <p class="mt-1 text-[10px] text-muted lg:mt-[5px] lg:text-[11px]">
          @julietteflorence · Bissoe &amp; Mithian
        </p>
        <div
          class="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[10px] font-medium text-white lg:mt-[11px] lg:px-[17px] lg:py-[9px] lg:text-[11px]"
        >
          <UIcon name="i-lucide-message-circle" class="size-[11px] lg:size-3" />
          Contact
        </div>
      </div>
      <!-- Availability header -->
      <div class="flex items-center justify-between px-4 pb-1.5 pt-4 lg:px-[18px] lg:pt-[16px]">
        <span class="text-[8px] font-semibold uppercase tracking-[0.18em] text-dimmed lg:text-[9px]">
          Availability
        </span>
        <span class="inline-flex items-center gap-1 text-[9px] font-medium text-success lg:text-[10px]">
          <span class="size-[5px] rounded-full bg-success" aria-hidden="true" />
          21 in season
        </span>
      </div>
      <!-- Flower rows -->
      <div
        v-for="flower in mockFlowers"
        :key="flower.name"
        class="items-center gap-2.5 border-t border-[#F0ECE5] px-4 py-2 lg:gap-[10px] lg:px-[18px] lg:py-[9px]"
        :class="flower.lgOnly ? 'hidden lg:flex' : 'flex'"
      >
        <img
          :src="flower.photo"
          :alt="flower.name"
          loading="lazy"
          class="h-[46px] w-[38px] shrink-0 rounded-[6px] object-cover lg:h-[50px] lg:w-[42px] lg:rounded-[7px]"
        />
        <div class="min-w-0 flex-1">
          <div class="font-display text-[12px] font-medium leading-tight text-default lg:text-[13px]">
            {{ flower.name }}
          </div>
          <div class="mt-px text-[9px] leading-snug text-muted lg:text-[10px]">{{ flower.meta }}</div>
          <div class="mt-0.5 text-[9px] leading-snug text-muted lg:text-[10px]">
            {{ flower.availability }} ·
            <span class="font-medium text-default">{{ flower.price }} / stem</span>
          </div>
        </div>
      </div>
      <!-- Bottom fade implying the list scrolls on -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-[74px] bg-gradient-to-b from-transparent to-white lg:h-[78px]"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
