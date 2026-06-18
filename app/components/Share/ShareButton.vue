<script setup lang="ts">
// Share affordance for a grower's public page (doc 10). Native share sheet on
// mobile (Web Share API); copy-to-clipboard + toast fallback elsewhere.
import { useClipboard } from '@vueuse/core'
import type { ButtonProps } from '@nuxt/ui'

const props = withDefaults(
  defineProps<{
    handle: string
    farmName: string
    variant?: ButtonProps['variant']
    size?: ButtonProps['size']
    color?: ButtonProps['color']
    block?: boolean
    label?: string
  }>(),
  {
    variant: 'soft',
    size: 'md',
    color: 'neutral',
    block: false,
    label: 'Share'
  }
)

const toast = useToast()
const { copy } = useClipboard()

// Absolute URL, correct across environments. useRequestURL() resolves on both
// SSR and client; window.location.origin is preferred on the client so the
// shared link reflects the address the visitor is actually on.
const requestUrl = useRequestURL()
const shareUrl = computed(() => {
  const origin = import.meta.client ? window.location.origin : requestUrl.origin
  return `${origin}/@${props.handle}`
})

const shareTitle = computed(() => props.farmName || 'Stems')
const shareText = computed(() => `${props.farmName}'s flower availability on Stems`)

// Feature-detect only on the client to avoid touching `navigator` during SSR.
const canNativeShare = ref(false)
onMounted(() => {
  canNativeShare.value = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
})

async function onShare() {
  const data = { title: shareTitle.value, text: shareText.value, url: shareUrl.value }

  if (canNativeShare.value && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return
    } catch (err) {
      // User dismissed the sheet — not an error worth surfacing.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Anything else: fall through to the clipboard fallback.
    }
  }

  try {
    await copy(shareUrl.value)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'error' })
  }
}
</script>

<template>
  <UButton
    :label="label"
    icon="i-lucide-share-2"
    :variant="variant"
    :size="size"
    :color="color"
    :block="block"
    @click="onShare"
  />
</template>
