<script setup lang="ts">
// Multi-photo crop-and-upload control. Manages an ordered list of R2 keys via
// the default v-model. Each added photo runs through the shared <CropModal>
// (square crop), then appends to the gallery. The first photo is the cover
// (lowest sortOrder on the server); growers can promote any photo to cover or
// remove individual photos.
//
// Contract:
//   <GalleryUploader v-model="state.photoKeys" :max-size="1280" :max="8" />
// Props:
//   modelValue (v-model)  ordered array of stored R2 keys (cover first)
//   maxSize              longest output edge in px (default 1280)
//   max                  maximum number of photos (default 8)
// Emits:
//   uploading            true while encoding/uploading, false when settled

interface Props {
  maxSize?: number
  max?: number
}
const props = withDefaults(defineProps<Props>(), {
  maxSize: 1280,
  max: 8
})

const keys = defineModel<string[]>({ default: () => [] })

const emit = defineEmits<{
  uploading: [value: boolean]
}>()

const crop = ref<{ pick: () => void } | null>(null)
const uploading = ref(false)
watch(uploading, (v) => emit('uploading', v))

// Local object-URL previews keyed by R2 key, for instant feedback after a fresh
// upload (avoids a round-trip to /img while R2 propagates). Falls back to the
// public URL for photos loaded from an existing flower.
const localPreviews = reactive(new Map<string, string>())
function previewFor(key: string): string {
  return localPreviews.get(key) ?? `/img/${key.replace(/^public\//, '')}`
}

const canAddMore = computed(() => keys.value.length < props.max)

function onUploaded({ key, url }: { key: string; url: string }) {
  // A multi-select batch can overshoot the cap — drop the overflow cleanly.
  if (keys.value.length >= props.max) {
    URL.revokeObjectURL(url)
    return
  }
  localPreviews.set(key, url)
  keys.value = [...keys.value, key]
}

function removeAt(index: number) {
  const next = [...keys.value]
  const [removed] = next.splice(index, 1)
  keys.value = next
  const url = removed && localPreviews.get(removed)
  if (removed && url) {
    URL.revokeObjectURL(url)
    localPreviews.delete(removed)
  }
}

// Promote a photo to the cover slot (index 0) without reordering the rest.
function makeCover(index: number) {
  if (index === 0) return
  const next = [...keys.value]
  const [moved] = next.splice(index, 1)
  next.unshift(moved!)
  keys.value = next
}

onBeforeUnmount(() => {
  for (const url of localPreviews.values()) URL.revokeObjectURL(url)
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
      <!-- Existing photos -->
      <div
        v-for="(key, index) in keys"
        :key="key"
        class="group relative aspect-square overflow-hidden rounded-xl border border-default bg-muted"
      >
        <img :src="previewFor(key)" alt="Flower photo" class="size-full object-cover" />

        <!-- Cover badge on the first photo -->
        <span
          v-if="index === 0"
          class="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
        >
          Cover
        </span>

        <!-- Remove -->
        <button
          type="button"
          class="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
          aria-label="Remove photo"
          @click="removeAt(index)"
        >
          <UIcon name="i-lucide-x" class="size-4" />
        </button>

        <!-- Set as cover -->
        <button
          v-if="index !== 0"
          type="button"
          class="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-md bg-black/55 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity hover:bg-black/75 focus:opacity-100 group-hover:opacity-100"
          @click="makeCover(index)"
        >
          <UIcon name="i-lucide-star" class="size-3" />
          Make cover
        </button>
      </div>

      <!-- Add tile -->
      <button
        v-if="canAddMore"
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default bg-muted text-muted transition-colors hover:text-default disabled:opacity-60"
        :disabled="uploading"
        @click="crop?.pick()"
      >
        <USkeleton v-if="uploading" class="size-full rounded-xl" />
        <template v-else>
          <UIcon name="i-lucide-camera" class="size-7" />
          <span class="text-xs font-medium">Add photo</span>
        </template>
      </button>
    </div>

    <p v-if="keys.length" class="text-xs text-muted">
      {{ keys.length }}/{{ max }} photos · the cover shows first in your shop.
    </p>

    <ImageCropModal
      ref="crop"
      :max-size="maxSize"
      multiple
      @uploaded="onUploaded"
      @uploading="uploading = $event"
    />
  </div>
</template>
