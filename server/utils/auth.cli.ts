/**
 * CLI-only Better Auth instance, used by `@better-auth/cli generate` so it
 * can emit a SQLite-flavoured migration. The real runtime auth instance
 * lives in `auth.ts` and uses the request-scoped D1 binding — that one
 * can't be statically imported because Workers bindings don't exist at
 * module load time.
 *
 * Keep the options here in sync with the runtime config in `auth.ts`. The
 * CLI reads this file statically, so anything missing here is missing from
 * the generated schema.
 */
import Database from 'better-sqlite3'
import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { stripe as stripePlugin } from '@better-auth/stripe'
import Stripe from 'stripe'

// CLI never makes real Stripe calls — but the plugin demands a client and
// secret at construction time so it can register schema/endpoints. Dummy
// values are fine for `generate`.
const stripeClient = new Stripe('sk_test_dummy_for_cli_schema_generation')

export const auth = betterAuth({
  database: new Database(':memory:'),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      referredByCode: { type: 'string', required: false, input: false }
    }
  },
  plugins: [
    magicLink({ sendMagicLink: async () => {} }),
    stripePlugin({
      stripeClient,
      stripeWebhookSecret: 'whsec_dummy_for_cli',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'stems',
            priceId: 'price_dummy_for_cli',
            freeTrial: { days: 7 }
          }
        ]
      }
    })
  ]
})
