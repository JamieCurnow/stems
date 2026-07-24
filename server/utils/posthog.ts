import { PostHog } from 'posthog-node'

let client: PostHog | null = null

/**
 * Shared server-side PostHog client, reused across requests.
 *
 * Configured for Cloudflare Workers: the isolate can be frozen the moment a
 * response is returned, so posthog-node's default batching (flushAt 20 / 10s
 * background timer) would silently drop events that never reach a flush — and
 * `setInterval` is unreliable in Workers anyway. We send each event
 * immediately (`flushAt: 1`) and disable the timer (`flushInterval: 0`).
 * Handlers that capture events must call `flushServerPostHog()` before
 * returning so delivery is awaited.
 */
export function useServerPostHog(): PostHog {
  if (!client) {
    const posthog = useRuntimeConfig().public.posthog
    client = new PostHog(posthog.publicKey, {
      host: posthog.host,
      flushAt: 1,
      flushInterval: 0
    })
  }
  return client
}

/**
 * Await delivery of any queued PostHog events. Call once before returning from
 * a Nitro handler that captured server-side events — on Workers the isolate can
 * be torn down the instant the response is sent. Never throws: analytics must
 * never break the request (mirrors `sendServerEvent`).
 */
export async function flushServerPostHog(): Promise<void> {
  if (!client) return
  try {
    await client.flush()
  } catch (err) {
    console.warn('[posthog] flush failed', (err as Error).message)
  }
}
