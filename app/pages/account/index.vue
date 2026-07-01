<script setup lang="ts">
import { avatarInitials, avatarTint } from '~~/shared/utils/avatar'
import type { ProfileRow } from '~~/server/db/schema'

// Owner's identity home. Gated behind auth + onboarding so `profile` is a row.
definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Your account', robots: 'noindex,nofollow' })

const toast = useToast()
const { signOut } = useAuth()
const { profile, ensure, set } = useProfile()

// SSR-friendly: make sure we have the profile before first paint.
await ensure()

// Photo-less avatar: warm tint + serif initials, consistent with the feed.
const initials = computed(() => avatarInitials(profile.value?.farmName ?? ''))
const tint = computed(() => avatarTint(profile.value?.handle ?? ''))

const avatarSrc = computed(() => {
  const key = profile.value?.avatarKey
  return key ? `/img/${key.replace(/^public\//, '')}` : undefined
})

const startingGrowing = ref(false)
async function startGrowing() {
  startingGrowing.value = true
  try {
    const updated = await $fetch<ProfileRow>('/api/profile', {
      method: 'PATCH',
      body: { isGrower: true }
    })
    set(updated)
  } catch {
    toast.add({ title: 'Could not update your account', color: 'error' })
  } finally {
    startingGrowing.value = false
  }
}

const signingOut = ref(false)
async function handleSignOut() {
  signingOut.value = true
  await signOut()
  set(null)
  await navigateTo('/login')
}
</script>

<template>
  <!-- The `app` layout already centres content in a max-w-screen-sm px-4 column;
       the extra px-2 brings the mobile gutter to ~24px (px-6 in the design) and
       max-w-[680px] widens the reading column on desktop. -->
  <div v-if="profile" class="mx-auto w-full max-w-[680px] px-2 pb-8 pt-6 sm:pt-16">
    <!-- Mobile-only top bar: eyebrow + settings shortcut. Optional polish; on
         desktop the floating nav and page context carry it. -->
    <div class="mb-7 flex items-center justify-between sm:hidden">
      <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Profile</span>
      <UButton
        :to="{ path: '/account/edit', query: { backRoute: '/account' } }"
        icon="i-lucide-settings"
        color="neutral"
        variant="outline"
        square
        :ui="{ base: 'rounded-full size-[38px] p-0 justify-center items-center' }"
        aria-label="Edit profile"
      />
    </div>

    <!-- Identity: avatar + name, sitting directly on the page. Avatar, name and
         handle all link through to the public grower page. -->
    <div class="flex items-center gap-[18px] sm:items-start sm:gap-[26px]">
      <ULink :to="`/@${profile.handle}`" :aria-label="`View ${profile.farmName}'s public page`" class="shrink-0">
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          :alt="profile.farmName"
          class="size-21 rounded-full object-cover sm:size-27"
        />
        <div
          v-else
          :class="tint"
          class="flex size-21 items-center justify-center rounded-full font-display text-[30px] font-medium sm:size-27 sm:text-[40px]"
          aria-hidden="true"
        >
          {{ initials }}
        </div>
      </ULink>

      <div class="min-w-0 flex-1">
        <ULink
          :to="`/@${profile.handle}`"
          class="block truncate font-display text-[30px] font-medium leading-none tracking-[-0.01em] text-default sm:text-[40px]"
        >
          <h1 class="truncate">{{ profile.farmName }}</h1>
        </ULink>

        <!-- Handle + location: stacked on mobile, inline on desktop -->
        <div class="mt-1.5 flex flex-col gap-2 sm:mt-2 sm:flex-row sm:items-center sm:gap-3.5">
          <ULink :to="`/@${profile.handle}`" class="text-[15px] text-dimmed sm:text-base">
            @{{ profile.handle }}
          </ULink>
          <p
            v-if="profile.locationName"
            class="flex min-w-0 items-center gap-1.5 text-sm text-muted sm:text-base"
          >
            <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0 text-dimmed" />
            <span class="truncate">{{ profile.locationName }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Bio + public-page link. Full width on mobile; on desktop indented to sit
         under the name (avatar 108px + 26px gap = 134px). -->
    <div class="sm:pl-[134px]">
      <p
        v-if="profile.bio"
        class="mt-5 max-w-[34ch] whitespace-pre-line text-[15px] leading-[1.5] text-[#4A453E] sm:mt-4 sm:max-w-[46ch] sm:text-base sm:leading-[1.55]"
      >
        {{ profile.bio }}
      </p>
      <p v-else class="mt-5 text-[15px] italic text-muted sm:mt-4">
        Tell florists about your flowers…
      </p>

      <ULink
        :to="`/@${profile.handle}`"
        class="group mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary sm:text-base"
      >
        View public page
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </ULink>
    </div>

    <!-- Hairline divider into the grower tools -->
    <div class="mt-[26px] border-t border-default sm:mt-[34px]" />

    <!-- Grower row: a single hairline-bounded row, not a boxed card -->
    <div class="flex items-center justify-between gap-4 border-b border-default py-[18px] sm:py-[22px]">
      <div v-if="profile.isGrower" class="min-w-0">
        <p class="font-display text-[21px] font-medium text-default sm:text-2xl">My Flowers</p>
        <p class="mt-1 text-[13px] text-muted sm:text-[15px]">Manage your live availability list.</p>
      </div>
      <div v-else class="min-w-0">
        <p class="font-display text-[21px] font-medium text-default sm:text-2xl">Start growing</p>
        <p class="mt-1 text-[13px] text-muted sm:text-[15px]">Turn on grower tools to list your flowers.</p>
      </div>

      <UButton
        v-if="profile.isGrower"
        to="/flowers"
        label="Open"
        trailing-icon="i-lucide-arrow-right"
        color="primary"
        variant="soft"
        class="shrink-0"
      />
      <UButton
        v-else
        label="Start growing"
        icon="i-lucide-flower-2"
        color="primary"
        :loading="startingGrowing"
        class="shrink-0"
        @click="startGrowing"
      />
    </div>

    <!-- Invoices row: grower tool, same hairline-row treatment -->
    <div
      v-if="profile.isGrower"
      class="flex items-center justify-between gap-4 border-b border-default py-[18px] sm:py-[22px]"
    >
      <div class="min-w-0">
        <p class="font-display text-[21px] font-medium text-default sm:text-2xl">Invoices</p>
        <p class="mt-1 text-[13px] text-muted sm:text-[15px]">
          Create and track invoices for your orders.
        </p>
      </div>
      <UButton
        to="/invoices"
        label="Open"
        trailing-icon="i-lucide-arrow-right"
        color="primary"
        variant="soft"
        class="shrink-0"
      />
    </div>

    <!-- Actions: outline pills, stacked on mobile and side by side on desktop -->
    <div class="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-3.5">
      <UButton
        :to="{ path: '/account/edit', query: { backRoute: '/account' } }"
        label="Edit profile"
        icon="i-lucide-pencil"
        block
        size="lg"
        color="neutral"
        variant="outline"
        class="sm:flex-1"
      />

      <ShareButton
        :handle="profile.handle"
        :farm-name="profile.farmName"
        label="Share my page"
        block
        size="lg"
        variant="outline"
        color="neutral"
        class="sm:flex-1"
      />
    </div>

    <div class="mt-6 sm:mt-7">
      <UButton
        label="Sign out"
        icon="i-lucide-log-out"
        color="neutral"
        variant="ghost"
        block
        :loading="signingOut"
        @click="handleSignOut"
      />
    </div>
  </div>
</template>
