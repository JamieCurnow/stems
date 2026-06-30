<script setup lang="ts">
// Presentational phone mockup for the marketing landing (`/`). Mirrors the live
// grower page (app/pages/@[handle]/index.vue) 1:1 so it reads as authentic, but
// it is a static illustration — never wired to live data. Sizing scales up at
// `lg` (≥1024px) per the desktop handoff: 272px device / 498px screen / 4 rows
// on mobile, 300px / 600px / 5 rows on desktop (Phlox is the lg-only fifth row).
// The `tint` gradients stand in for real grower photos.
const mockFlowers = [
  {
    name: 'Icelandic poppies',
    meta: 'Peach, white · 40cm',
    availability: 'Good',
    price: '£1.00',
    tint: 'linear-gradient(140deg,#FCE6D2,#F4B488)'
  },
  {
    name: 'Sweet peas',
    meta: 'Scented mix · 30cm',
    availability: 'Limited',
    price: '£0.50',
    tint: 'linear-gradient(140deg,#F7DCE6,#E6A8C4)'
  },
  {
    name: 'Cosmos',
    meta: 'Double cranberry · 60cm',
    availability: 'Limited',
    price: '£0.80',
    tint: 'linear-gradient(140deg,#F8DAD6,#E4A0AB)'
  },
  {
    name: 'Cornflower',
    meta: 'Blue · 50cm',
    availability: 'Available',
    price: '£0.30',
    tint: 'linear-gradient(140deg,#E3E7EF,#A9B6D6)'
  },
  {
    name: 'Phlox',
    meta: 'Crème caramel · 60cm',
    availability: 'Good',
    price: '£0.85',
    tint: 'linear-gradient(140deg,#F8EADB,#E8C99B)',
    lgOnly: true
  }
]
</script>

<template>
  <div
    class="w-[272px] rounded-[42px] bg-[#1c1a17] p-[7px] shadow-[0_26px_52px_-22px_rgba(33,30,26,0.5),0_8px_18px_rgba(33,30,26,0.18)] lg:w-[300px] lg:rounded-[46px] lg:p-[8px] lg:shadow-[0_34px_64px_-26px_rgba(33,30,26,0.5),0_10px_22px_rgba(33,30,26,0.18)]"
  >
    <div
      class="relative h-[498px] overflow-hidden rounded-[34px] bg-white text-left lg:h-[600px] lg:rounded-[38px]"
    >
      <!-- Notch pill -->
      <div
        class="absolute left-1/2 top-[9px] z-10 h-[6px] w-[76px] -translate-x-1/2 rounded-full bg-white/70 lg:top-[11px] lg:w-[84px]"
        aria-hidden="true"
      />
      <!-- Banner (placeholder gradient; swap for a real banner image) -->
      <div
        class="h-[98px] lg:h-[110px]"
        style="
          background:
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0 8px, rgba(255, 255, 255, 0) 8px 16px),
            linear-gradient(150deg, #eaefe4, #d2dcc6 68%, #eae2d2);
        "
        aria-hidden="true"
      />
      <!-- Identity -->
      <div class="px-3.5 text-center lg:px-4">
        <div
          class="-mt-[29px] mx-auto flex size-[58px] items-center justify-center rounded-full border-[3px] border-white bg-[linear-gradient(135deg,#FCE8E3,#F2A491)] font-display text-[18px] font-medium text-white shadow-[0_2px_6px_rgba(33,30,26,0.14)] lg:-mt-[32px] lg:size-[64px] lg:text-[20px]"
        >
          JF
        </div>
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
        <span class="inline-flex items-center gap-1 text-[9px] font-medium text-primary lg:text-[10px]">
          <span class="size-[5px] rounded-full bg-primary" aria-hidden="true" />
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
        <div
          class="flex h-[46px] w-[38px] shrink-0 items-center justify-center rounded-[6px] lg:h-[50px] lg:w-[42px] lg:rounded-[7px]"
          :style="{
            background: `repeating-linear-gradient(45deg, rgba(255,255,255,.16) 0 6px, rgba(255,255,255,0) 6px 12px), ${flower.tint}`
          }"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-flower-2" class="size-[15px] text-white/65 lg:size-4" />
        </div>
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
