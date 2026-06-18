# Snippets — drop-in starter files

Copy these into the new repo (preserving paths) and run a find/replace pass on the placeholders documented in `../README.md`. Each file carries a short comment at the top explaining its role.

```
snippets/
├── .cloudflare/worker.ts
├── .env.example
├── .gitignore
├── .github/workflows/
│   ├── deploy-staging.yml
│   └── deploy-production.yml
├── gtm-container-template.json
├── nuxt.config.ts
├── package.json
├── pwa-assets.config.ts
├── tsconfig.json
├── wrangler.jsonc
├── public/
│   ├── App_icon_maskable.svg
│   └── App_icon_monochrome.svg
├── app/
│   ├── app.vue
│   ├── error.vue
│   ├── assets/css/main.css
│   ├── components/Layout/
│   │   ├── CookieConsent.vue
│   │   └── ConsentManageDialog.vue
│   ├── composables/
│   │   ├── useAnalytics.ts
│   │   ├── useAnalyticsIdentity.ts
│   │   ├── useAuth.ts
│   │   ├── useConsent.ts
│   │   └── useSubscription.ts
│   ├── middleware/
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   └── subscription.ts
│   ├── pages/login.vue
│   ├── plugins/analytics.client.ts
│   └── utils/auth-client.ts
├── server/
│   ├── api/
│   │   ├── auth/[...all].ts
│   │   ├── billing/{me.get.ts, portal.post.ts}
│   │   ├── stripe/webhook.post.ts
│   │   ├── email/{preferences.get.ts, preferences.put.ts}
│   │   ├── resend/webhook.post.ts
│   │   ├── admin/{me.get.ts, email-test.post.ts, email-preview/[name].get.ts}
│   │   ├── cron/email-scheduler.post.ts
│   │   └── files/[...path].get.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations/
│   │       ├── 0001_better_auth.sql
│   │       ├── 0002_app_tables.sql
│   │       ├── 0003_stripe.sql
│   │       ├── 0004_referrals.sql
│   │       └── 0005_email.sql
│   ├── durable-objects/EmailScheduler.ts
│   ├── emails/
│   │   ├── _layout.ts
│   │   ├── _types.ts
│   │   ├── index.ts
│   │   ├── magic-link.ts
│   │   ├── system-test.ts
│   │   └── welcome.ts
│   ├── routes/
│   │   ├── email/unsubscribe.get.ts
│   │   └── r/[code].get.ts
│   ├── types/cloudflare.d.ts
│   └── utils/
│       ├── analytics.ts
│       ├── auth.ts
│       ├── auth.cli.ts
│       ├── db.ts
│       ├── email.ts
│       ├── emailCategory.ts
│       ├── referrals.ts
│       ├── requireActiveSubscription.ts
│       ├── requireAdmin.ts
│       ├── requireAdminUser.ts
│       ├── requireUser.ts
│       ├── resend.ts
│       └── stripe.ts
└── shared/utils/constants.ts
```

## Placeholders

| Token                   | Replace with                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `{{APP_NAME}}`          | Human-readable name (e.g. `Acme`)                                |
| `{{APP_SLUG}}`          | Kebab-case slug used for worker/D1 names and the plan name       |
| `{{APP_DOMAIN}}`        | Apex domain (e.g. `acme.com`)                                    |
| `{{APP_REF_COOKIE}}`    | Referral cookie name (e.g. `acme_ref`) — only if referrals stay  |
| `{{MAIL_FROM_LOCAL}}`   | Local part of From address (e.g. `hello`)                        |
| `{{ADMIN_EMAIL}}`       | Bootstrap admin email address                                    |

`gtm-container-template.json` carries two more placeholders (`{{CONTAINER_NAME}}`,
`{{GA4_MEASUREMENT_ID}}`) that you fill by hand when importing the container —
see `../11-analytics-gtm-ga4.md`. They're not part of the `sed` pass below.

`sed` one-liner (BSD/Mac):

```bash
find . -type f \( -name '*.ts' -o -name '*.vue' -o -name '*.sql' -o -name '*.json' -o -name '*.jsonc' -o -name '*.yml' -o -name '*.md' -o -name '.env.example' \) \
  -exec sed -i '' \
    -e 's/{{APP_NAME}}/Acme/g' \
    -e 's/{{APP_SLUG}}/acme/g' \
    -e 's/{{APP_DOMAIN}}/acme.com/g' \
    -e 's/{{APP_REF_COOKIE}}/acme_ref/g' \
    -e 's/{{MAIL_FROM_LOCAL}}/hello/g' \
    -e 's/{{ADMIN_EMAIL}}/you@example.com/g' \
    {} +
```

GNU sed: drop the empty `''` after `-i`.
