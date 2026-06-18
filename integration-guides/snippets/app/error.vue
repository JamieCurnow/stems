<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>()
const heading = computed(() => (props.error.statusCode === 404 ? 'Not found' : 'Something went wrong'))
</script>

<template>
  <UApp>
    <main class="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <p class="text-sm text-neutral-500">
          {{ error.statusCode }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold">
          {{ heading }}
        </h1>
        <UButton class="mt-6" to="/" @click="clearError({ redirect: '/' })">
          Back home
        </UButton>
      </div>
    </main>
  </UApp>
</template>
