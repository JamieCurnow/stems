<script setup lang="ts">
// Headless crop-and-upload engine shared by <ImageUploader> (single photo) and
// <GalleryUploader> (multi-photo). It owns the file <input>, the framing modal
// (drag to reposition, pinch/scroll to zoom), the canvas crop, WebP/JPEG
// encode, and the POST to /api/uploads. It renders no preview chrome of its own
// — the parent calls pick() to start a flow and listens for `uploaded`.
//
// Contract:
//   <CropModal ref="crop" :max-size="1280" @uploaded="..." @uploading="..." />
//   crop.value?.pick()                       // open the file dialog
// Props:
//   maxSize  longest output edge in px (default 1280; avatars 512)
//   aspect   crop width / height (default 1 → square; banner 16/9)
// Emits:
//   uploaded  { key, url } — the stored R2 key plus a local object URL for an
//             instant preview. The PARENT owns `url` and must revoke it.
//   uploading true while encoding/uploading, false when settled

interface Props {
  maxSize?: number
  aspect?: number
}
const props = withDefaults(defineProps<Props>(), {
  maxSize: 1280,
  aspect: 1
})

const emit = defineEmits<{
  uploaded: [payload: { key: string; url: string }]
  uploading: [value: boolean]
}>()

const toast = useToast()

// Output dimensions: maxSize is the longest edge; the short edge follows aspect.
const outW = computed(() => (props.aspect >= 1 ? props.maxSize : Math.round(props.maxSize * props.aspect)))
const outH = computed(() => (props.aspect >= 1 ? Math.round(props.maxSize / props.aspect) : props.maxSize))

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
watch(uploading, (v) => emit('uploading', v))

// ── Crop modal state ────────────────────────────────────────────────────────
const cropOpen = ref(false)
const sourceImg = ref<HTMLImageElement | null>(null)
const sourceUrl = ref<string | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)

// Pan offset (px, relative to centered cover position) and zoom multiplier.
const offset = reactive({ x: 0, y: 0 })
const zoom = ref(1)

function pick() {
  fileInput.value?.click()
}
defineExpose({ pick })

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'That file is not an image', color: 'error' })
    input.value = ''
    return
  }

  // Revoke any previous source url before replacing.
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = URL.createObjectURL(file)

  const img = new Image()
  img.onload = () => {
    sourceImg.value = img
    offset.x = 0
    offset.y = 0
    zoom.value = 1
    cropOpen.value = true
  }
  img.onerror = () => {
    toast.add({ title: 'Could not read that image', color: 'error' })
  }
  img.src = sourceUrl.value
  // Allow re-selecting the same file later.
  input.value = ''
}

// ── Drag to reposition ────────────────────────────────────────────────────
let dragging = false
let startX = 0
let startY = 0
let startOffX = 0
let startOffY = 0

function onPointerDown(e: PointerEvent) {
  dragging = true
  startX = e.clientX
  startY = e.clientY
  startOffX = offset.x
  startOffY = offset.y
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  offset.x = startOffX + (e.clientX - startX)
  offset.y = startOffY + (e.clientY - startY)
}
function onPointerUp(e: PointerEvent) {
  dragging = false
  ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
}

// Background-size/position for the live preview inside the square stage.
// We render the image as a CSS background using cover semantics so the on-screen
// frame matches the canvas crop math below.
const stageStyle = computed(() => {
  if (!sourceImg.value) return {}
  return {
    backgroundImage: `url(${sourceUrl.value})`,
    backgroundSize: `${zoom.value * 100}%`,
    backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
    backgroundRepeat: 'no-repeat'
  }
})

// ── Crop → canvas → blob → upload ───────────────────────────────────────────
async function confirmCrop() {
  const img = sourceImg.value
  const stage = stageRef.value
  if (!img || !stage) return

  cropOpen.value = false
  uploading.value = true

  try {
    const canvas = document.createElement('canvas')
    canvas.width = outW.value
    canvas.height = outH.value
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')

    // Reproduce the on-screen cover crop. The stage is a rectangle matching the
    // target aspect; the image is drawn cover-fit (scaled so it fully covers the
    // stage) times `zoom`, then panned by `offset`.
    const stageW = stage.clientWidth || outW.value
    const stageH = stage.clientHeight || outH.value
    const cover = Math.max(stageW / img.width, stageH / img.height)
    const scale = cover * zoom.value
    const drawW = img.width * scale
    const drawH = img.height * scale
    // Top-left of the drawn image within the stage (centered + panned).
    const drawX = (stageW - drawW) / 2 + offset.x
    const drawY = (stageH - drawH) / 2 + offset.y

    // Source rect (in original-image px) that maps onto the full stage.
    const sx = (-drawX / drawW) * img.width
    const sy = (-drawY / drawH) * img.height
    const sW = stageW / scale
    const sH = stageH / scale

    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, outW.value, outH.value)

    const blob = await encode(canvas)
    if (!blob) throw new Error('Encoding failed')

    const res = await $fetch<{ key: string }>('/api/uploads', {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': blob.type }
    })

    // Hand the parent the key plus a local object URL for an instant preview.
    // Ownership transfers to the parent — it revokes the url when done.
    emit('uploaded', { key: res.key, url: URL.createObjectURL(blob) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    toast.add({ title: 'Could not upload photo', description: message, color: 'error' })
  } finally {
    uploading.value = false
  }
}

// Encode to WebP, fall back to JPEG if the browser can't encode WebP.
function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === 'image/webp') return resolve(blob)
        canvas.toBlob((jpeg) => resolve(jpeg), 'image/jpeg', 0.82)
      },
      'image/webp',
      0.82
    )
  })
}

function cancelCrop() {
  cropOpen.value = false
}

onBeforeUnmount(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
})
</script>

<template>
  <div class="contents">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Crop modal -->
    <UModal v-model:open="cropOpen" title="Frame your photo">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted">Drag to reposition, zoom to fit the frame.</p>
          <div
            ref="stageRef"
            class="relative mx-auto w-full max-w-sm touch-none overflow-hidden rounded-lg bg-muted select-none"
            :style="{ ...stageStyle, aspectRatio: String(aspect) }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <!-- subtle frame overlay -->
            <div class="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/30" />
          </div>

          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-zoom-out" class="size-4 shrink-0 text-muted" />
            <input
              v-model.number="zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              class="w-full accent-primary"
              aria-label="Zoom"
            />
            <UIcon name="i-lucide-zoom-in" class="size-4 shrink-0 text-muted" />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="cancelCrop" />
          <UButton label="Use photo" color="primary" icon="i-lucide-check" @click="confirmCrop" />
        </div>
      </template>
    </UModal>
  </div>
</template>
