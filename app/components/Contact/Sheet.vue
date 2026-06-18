<script setup lang="ts">
// "Contact the grower" sheet. Lists the methods a grower has filled in and
// hands off to the buyer's native app (WhatsApp / mail client / Instagram) via
// deep links — Stems has no in-app messaging. Renders as a UDrawer (bottom
// sheet) on mobile and a UModal on desktop, mirroring Flower/Form.vue.
import { UModal, UDrawer } from '#components'
import { contactOptions } from '~~/shared/utils/contact'
import type { PublicProfileDto } from '~~/shared/types/profile'

const props = defineProps<{ profile: PublicProfileDto }>()
const open = defineModel<boolean>('open', { default: false })

// Same SSR-safe breakpoint dance as Flower/Form.vue: start as a drawer to match
// the server render, then switch to the modal once mounted on wide viewports.
const isDesktop = useMediaQuery('(min-width: 640px)')
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const layout = computed(() => (mounted.value && isDesktop.value ? UModal : UDrawer))

const options = computed(() => contactOptions(props.profile))
const title = computed(() => `Contact ${props.profile.farmName}`)
</script>

<template>
  <component :is="layout" v-model:open="open" :title="title">
    <template #body>
      <div class="mx-auto flex w-full max-w-md flex-col gap-3 pb-2">
        <p class="text-sm text-muted">
          Reach out to {{ profile.farmName }} directly to ask about availability and place an order.
        </p>

        <UButton
          v-for="opt in options"
          :key="opt.key"
          :to="opt.href"
          :target="opt.external ? '_blank' : undefined"
          rel="noopener"
          :icon="opt.icon"
          color="neutral"
          variant="soft"
          size="lg"
          block
          class="justify-start"
          @click="open = false"
        >
          {{ opt.label }}
          <template v-if="opt.key === profile.preferredContact" #trailing>
            <span class="ml-auto text-xs font-normal text-dimmed">Preferred</span>
          </template>
        </UButton>
      </div>
    </template>
  </component>
</template>
