import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

/**
 * Example "product" category template. Sent post-signup. Replace with your
 * own onboarding content.
 */
export interface WelcomeProps {
  firstName?: string
}

const template: EmailTemplate<WelcomeProps> = ({ firstName }, { baseUrl }) => ({
  subject: 'Welcome to {{APP_NAME}}',
  preheader: 'Glad you\'re here.',
  html: `
    <p>Hey ${firstName ? escapeHtml(firstName) : 'there'},</p>
    <p>Welcome aboard. Here's what to do next:</p>
    <ol>
      <li>Pop into the app: <a href="${escapeHtml(baseUrl)}/app">${escapeHtml(baseUrl)}/app</a></li>
      <li>Replace this email with one that actually helps your users.</li>
    </ol>
    <p>Shout if you hit anything weird — we read every reply.</p>
  `,
  text: `Hey ${firstName ?? 'there'},

Welcome aboard. Here's what to do next:

  1. Pop into the app: ${baseUrl}/app
  2. Replace this email with one that actually helps your users.

Shout if you hit anything weird — we read every reply.`
})

export default template
