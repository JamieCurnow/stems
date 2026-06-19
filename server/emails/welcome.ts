import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

/**
 * Welcome email, sent post-signup. Warm, understated grower onboarding — gets
 * a new grower from "signed up" to "page live with flowers on it".
 */
export interface WelcomeProps {
  firstName?: string
}

const template: EmailTemplate<WelcomeProps> = ({ firstName }, { baseUrl }) => ({
  subject: 'Welcome to Stems',
  preheader: "Let's get your flowers in front of people.",
  html: `
    <p>Hey ${firstName ? escapeHtml(firstName) : 'there'},</p>
    <p>Welcome to Stems — the marketplace for local-grown flowers. Glad you're here. Three quick things to get your page looking its best:</p>
    <ol style="margin:16px 0;padding-left:20px;line-height:1.7;">
      <li><strong>Finish your page</strong> — add a photo, a line about your patch, and where you grow.</li>
      <li><strong>List what's in season</strong> — add your first few flowers with a photo and a price.</li>
      <li><strong>Share your page</strong> — your Stems link is yours to post wherever your buyers already are.</li>
    </ol>
    <p style="margin:28px 0;">
      <a href="${escapeHtml(baseUrl)}/app" style="display:inline-block;background:#E38475;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:9999px;font-weight:600;">Set up your page</a>
    </p>
    <p>Shout if you hit anything weird — we read every reply.</p>
  `,
  text: `Hey ${firstName ?? 'there'},

Welcome to Stems — the marketplace for local-grown flowers. Glad you're here. Three quick things to get your page looking its best:

  1. Finish your page — add a photo, a line about your patch, and where you grow.
  2. List what's in season — add your first few flowers with a photo and a price.
  3. Share your page — your Stems link is yours to post wherever your buyers already are.

Set up your page: ${baseUrl}/app

Shout if you hit anything weird — we read every reply.`
})

export default template
