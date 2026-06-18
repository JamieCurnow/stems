<script setup lang="ts">
// Single-photo crop-and-upload control used by avatars (doc 05) and profile
// banners (doc 07). The crop+upload engine lives in <CropModal>; this component
// owns the preview/dropzone chrome and the stored R2 key (default v-model).
// Pick or capture a photo, frame it, and the returned R2 key is emitted via the
// default v-model (the stored R2 key string, or null).
//
// Contract:
//   <ImageUploader v-model="row.avatarKey" :max-size="512" shape="round" />
//   <ImageUploader v-model="row.bannerKey" :max-size="1280" :aspect="16 / 9" />
// Props:
//   modelValue (v-model)  the stored R2 key, or null
//   maxSize              longest output edge in px (default 1280; avatars 512)
//   aspect               crop width / height (default 1 → square; banner 16/9)
//   shape                'square' (default) | 'round' — preview chrome only
//   label                button text when empty (default 'Add photo')
// Emits:
//   uploading            true while encoding/uploading, false when settled
//
// For multiple photos per record, use <GalleryUploader> instead.

interface Props {
  maxSize?: number
  aspect?: number
  shape?: 'square' | 'round'
  label?: string
}
withDefaults(defineProps<Props>(), {
  maxSize: 1280,
  aspect: 1,
  shape: 'square',
  label: 'Add photo'
})

// NB: the model is the DEFAULT v-model (`modelValue`), NOT `v-model:key`.
// `key` is a Vue-reserved attribute — binding it is consumed by the renderer as
// the VNode key and never reaches the component, so two-way binding silently
// breaks (uploads succeed but the stored key never propagates back to the page).
const modelKey = defineModel<string | null>({ default: null })

const emit = defineEmits<{
  uploading: [value: boolean]
}>()

const crop = ref<{ pick: () => void } | null>(null)
const uploading = ref(false)
watch(uploading, (v) => emit('uploading', v))

// Preview shown in the dropzone. Prefer a just-uploaded object URL, else the
// public URL derived from the stored key.
const localPreview = ref<string | null>(null)
const previewUrl = computed(() => {
  if (localPreview.value) return localPreview.value
  return modelKey.value ? `/img/${modelKey.value.replace(/^public\//, '')}` : null
})

function onUploaded({ key, url }: { key: string; url: string }) {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = url
  modelKey.value = key
}

function removePhoto() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = null
  modelKey.value = null
}

onBeforeUnmount(() => {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
})
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <!-- Preview / dropzone -->
    <div
      class="relative overflow-hidden border border-default bg-muted"
      :class="[
        shape === 'round' ? 'rounded-full' : 'rounded-xl',
        aspect === 1 ? 'size-40' : 'w-full max-w-sm'
      ]"
      :style="aspect === 1 ? undefined : { aspectRatio: String(aspect) }"
    >
      <USkeleton v-if="uploading" class="size-full" />
      <img v-else-if="previewUrl" :src="previewUrl" alt="Selected photo" class="size-full object-cover" />
      <button
        v-else
        type="button"
        class="flex size-full flex-col items-center justify-center gap-1 text-muted transition-colors hover:text-default"
        @click="crop?.pick()"
      >
        <UIcon name="i-lucide-camera" class="size-8" />
        <span class="text-xs font-medium">{{ label }}</span>
      </button>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <UButton
        :label="previewUrl ? 'Change' : label"
        icon="i-lucide-image-plus"
        color="primary"
        variant="soft"
        size="sm"
        :loading="uploading"
        :disabled="uploading"
        @click="crop?.pick()"
      />
      <UButton
        v-if="previewUrl && !uploading"
        label="Remove"
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="removePhoto"
      />
    </div>

    <ImageCropModal
      ref="crop"
      :max-size="maxSize"
      :aspect="aspect"
      @uploaded="onUploaded"
      @uploading="uploading = $event"
    />
  </div>
</template>
