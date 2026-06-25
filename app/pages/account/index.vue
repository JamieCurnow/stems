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
  <div v-if="profile" class="mx-auto w-full max-w-md px-4 py-8">
    <!-- Identity: avatar + name, sitting directly on the page -->
    <div class="flex items-start gap-4">
      <img
        v-if="avatarSrc"
        :src="avatarSrc"
        :alt="profile.farmName"
        class="size-20 shrink-0 rounded-full object-cover"
      />
      <div
        v-else
        :class="tint"
        class="flex size-20 shrink-0 items-center justify-center rounded-full font-display text-2xl font-medium"
        aria-hidden="true"
      >
        {{ initials }}
      </div>

      <div class="min-w-0 flex-1 pt-1">
        <h1 class="truncate font-display text-2xl font-medium text-default">
          {{ profile.farmName }}
        </h1>
        <p class="text-sm text-muted">@{{ profile.handle }}</p>
        <p v-if="profile.locationName" class="mt-1 flex items-center gap-1 text-sm text-muted">
          <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
          <span class="truncate">{{ profile.locationName }}</span>
        </p>
      </div>
    </div>

    <p v-if="profile.bio" class="mt-4 whitespace-pre-line text-sm text-default">{{ profile.bio }}</p>
    <p v-else class="mt-4 text-sm italic text-muted">Tell florists about your flowers…</p>

    <ULink
      :to="`/@${profile.handle}`"
      class="group mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
    >
      View public page
      <UIcon
        name="i-lucide-arrow-up-right"
        class="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </ULink>

    <!-- Grower row: a single hairline-bounded row, not a boxed card -->
    <div class="mt-8 flex items-center justify-between gap-4 border-y border-default py-5">
      <div v-if="profile.isGrower">
        <p class="font-display text-lg font-medium text-default">My Flowers</p>
        <p class="text-sm text-muted">Manage your live availability list.</p>
      </div>
      <div v-else>
        <p class="font-display text-lg font-medium text-default">Start growing</p>
        <p class="text-sm text-muted">Turn on grower tools to list your flowers.</p>
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
    <div v-if="profile.isGrower" class="flex items-center justify-between gap-4 border-b border-default py-5">
      <div>
        <p class="font-display text-lg font-medium text-default">Invoices</p>
        <p class="text-sm text-muted">Create and track invoices for your orders.</p>
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

    <!-- Actions: quiet hairline pills (clearly tappable on white, still calm) -->
    <div class="mt-6 flex flex-col gap-3">
      <UButton
        to="/account/edit"
        label="Edit profile"
        icon="i-lucide-pencil"
        block
        size="lg"
        color="neutral"
        variant="outline"
      />

      <ShareButton
        :handle="profile.handle"
        :farm-name="profile.farmName"
        label="Share my page"
        block
        size="lg"
        variant="outline"
        color="neutral"
      />
    </div>

    <div class="mt-8">
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
