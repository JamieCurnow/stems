<script setup lang="ts">
import type { ProfileRow } from '~~/server/db/schema'

// Owner-facing edit form. Gated so `profile` is a row by the time we render.
definePageMeta({ middleware: ['auth', 'onboarding'], layout: 'app' })

useSeoMeta({ title: 'Edit profile', robots: 'noindex,nofollow' })

const toast = useToast()
const { profile, ensure, set } = useProfile()

await ensure()

// Image keys are bound to <ImageUploader> via its default v-model, whose model
// type is `string | undefined` (the component defaults the key to null internally).
const avatarKey = ref<string | undefined>(profile.value?.avatarKey ?? undefined)
const bannerKey = ref<string | undefined>(profile.value?.bannerKey ?? undefined)

// Local editable copy seeded from the cached profile. Handle is read-only in V1.
const state = reactive({
  farmName: profile.value?.farmName ?? '',
  bio: profile.value?.bio ?? '',
  locationName: profile.value?.locationName ?? '',
  postcode: profile.value?.postcode ?? '',
  instagram: profile.value?.instagram ?? '',
  website: profile.value?.website ?? '',
  whatsapp: profile.value?.whatsapp ?? '',
  contactEmail: profile.value?.contactEmail ?? '',
  preferredContact: profile.value?.preferredContact ?? '',
  isGrower: profile.value?.isGrower ?? false
})

// Preferred-method options track which contact fields are actually filled, so a
// grower can't pick a method they haven't provided.
const preferredOptions = computed(() => {
  const opts = [{ label: 'No preference', value: '' }]
  if (state.whatsapp.trim()) opts.push({ label: 'WhatsApp', value: 'whatsapp' })
  if (state.contactEmail.trim()) opts.push({ label: 'Email', value: 'email' })
  if (state.instagram.trim()) opts.push({ label: 'Instagram', value: 'instagram' })
  return opts
})

const uploading = ref(false)
const saving = ref(false)

// Client-side validation mirrors the server guards so we fail fast & inline.
function validate(): string | null {
  const farmName = state.farmName.trim()
  if (!farmName) return 'Please enter a farm or display name.'
  if (farmName.length > 80) return 'Farm name must be 80 characters or fewer.'
  if (state.bio.trim().length > 1000) return 'Your bio must be 1000 characters or fewer.'
  const ig = state.instagram.trim().replace(/^@/, '')
  if (ig && !/^[A-Za-z0-9._]+$/.test(ig)) {
    return 'Instagram handle can only contain letters, numbers, dots and underscores.'
  }
  const email = state.contactEmail.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid contact email.'
  }
  const waDigits = state.whatsapp.replace(/\D/g, '')
  if (state.whatsapp.trim() && (waDigits.length < 7 || waDigits.length > 15)) {
    return 'Enter a valid WhatsApp number, including the country code.'
  }
  return null
}

async function save() {
  const error = validate()
  if (error) {
    toast.add({ title: error, color: 'error' })
    return
  }

  saving.value = true
  try {
    const updated = await $fetch<ProfileRow>('/api/profile', {
      method: 'PATCH',
      body: {
        farmName: state.farmName,
        bio: state.bio,
        locationName: state.locationName,
        postcode: state.postcode,
        instagram: state.instagram,
        website: state.website,
        whatsapp: state.whatsapp,
        contactEmail: state.contactEmail,
        // Drop a stale preference if the matching field is now empty.
        preferredContact: preferredOptions.value.some((o) => o.value === state.preferredContact)
          ? state.preferredContact || null
          : null,
        avatarKey: avatarKey.value ?? null,
        bannerKey: bannerKey.value ?? null,
        isGrower: state.isGrower
      }
    })
    set(updated)
    await navigateTo('/account')
  } catch (e) {
    const message =
      typeof e === 'object' && e && 'statusMessage' in e && typeof e.statusMessage === 'string'
        ? e.statusMessage
        : 'Could not save your profile. Please try again.'
    toast.add({ title: message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md px-4 py-6">
    <header class="mb-6 flex items-center gap-2">
      <UButton
        to="/account"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Back to account"
      />
      <h1 class="font-display text-2xl font-medium text-default">Edit profile</h1>
    </header>

    <UForm :state="state" class="flex flex-col gap-6" @submit="save">
      <!-- Images -->
      <section class="flex flex-col gap-5">
        <div>
          <p class="mb-2 text-sm font-medium text-default">Avatar</p>
          <ImageUploader
            v-model="avatarKey"
            :max-size="512"
            shape="round"
            label="Add avatar"
            @uploading="uploading = $event"
          />
        </div>
        <div>
          <p class="mb-2 text-sm font-medium text-default">Banner</p>
          <p class="mb-2 text-xs text-muted">Optional wide image shown on your public page.</p>
          <ImageUploader
            v-model="bannerKey"
            :max-size="1280"
            :aspect="16 / 9"
            label="Add banner"
            @uploading="uploading = $event"
          />
        </div>
      </section>

      <!-- About -->
      <section class="flex flex-col gap-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">About</h2>

        <UFormField label="Handle" help="Contact support to change your handle.">
          <UInput :model-value="`@${profile?.handle ?? ''}`" disabled readonly class="w-full" />
        </UFormField>

        <UFormField label="Farm or display name" required>
          <UInput v-model="state.farmName" placeholder="e.g. Bramble & Bloom" maxlength="80" class="w-full" />
        </UFormField>

        <UFormField label="Bio" help="Tell florists about your flowers.">
          <UTextarea
            v-model="state.bio"
            :rows="5"
            maxlength="1000"
            placeholder="Tell florists about your flowers…"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Location">
          <UInput v-model="state.locationName" placeholder="e.g. Bissoe, Cornwall" class="w-full" />
        </UFormField>

        <UFormField label="Postcode" help="Optional. Helps buyers find growers nearby (coming soon).">
          <UInput
            v-model="state.postcode"
            placeholder="e.g. TR4 8QZ"
            autocapitalize="characters"
            class="w-full"
          />
        </UFormField>
      </section>

      <!-- Links -->
      <section class="flex flex-col gap-5">
        <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Links</h2>

        <UFormField label="Instagram">
          <UInput
            v-model="state.instagram"
            placeholder="yourhandle"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          >
            <template #leading>
              <span class="text-muted">@</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Website">
          <UInput
            v-model="state.website"
            type="url"
            placeholder="yourfarm.co.uk"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>
      </section>

      <!-- Contact buyers -->
      <section class="flex flex-col gap-5">
        <div>
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Contact buyers</h2>
          <p class="mt-1 text-xs text-muted">
            Shown publicly so buyers can reach you to order. Leave a field blank to hide it.
          </p>
        </div>

        <UFormField label="WhatsApp" help="Include your country code, e.g. +44 7700 900000.">
          <UInput
            v-model="state.whatsapp"
            type="tel"
            inputmode="tel"
            placeholder="+44 7700 900000"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Contact email" help="A public address for orders — not your login email.">
          <UInput
            v-model="state.contactEmail"
            type="email"
            placeholder="hello@yourfarm.co.uk"
            autocapitalize="none"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Preferred method" help="Shown first when buyers tap “Contact to buy”.">
          <USelect v-model="state.preferredContact" :items="preferredOptions" class="w-full" />
        </UFormField>
      </section>

      <!-- Grower toggle -->
      <section class="flex items-start justify-between gap-4 rounded-xl bg-muted px-4 py-3.5">
        <div>
          <p class="text-sm font-medium text-default">I grow flowers</p>
          <p class="text-xs text-muted">List your flowers and appear in search.</p>
        </div>
        <USwitch v-model="state.isGrower" />
      </section>

      <UButton
        type="submit"
        label="Save changes"
        icon="i-lucide-check"
        block
        size="lg"
        class="mt-1 font-medium"
        :loading="saving"
        :disabled="uploading || saving"
      />
    </UForm>
  </div>
</template>
