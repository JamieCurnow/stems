import type { EmailTemplate, EmailTemplateContext, RenderedTemplate } from './_types'
import { renderLayoutHtml, renderLayoutText } from './_layout'
import { isExternalEmail } from '../utils/emailCategory'

import magicLink from './magic-link'
import systemTest from './system-test'
import welcome from './welcome'
import invoice from './invoice'

/**
 * Registry of every email template the app can send. Add a new template by:
 *   1. Creating server/emails/<id>.ts (default-export an EmailTemplate<Props>)
 *   2. Importing + registering it here.
 *   3. Adding its category in server/utils/emailCategory.ts.
 */
const templates = {
  'magic-link': magicLink,
  'system-test': systemTest,
  welcome,
  invoice
} as const satisfies Record<string, EmailTemplate<never>>

export type EmailId = keyof typeof templates

export const isEmailId = (id: string): id is EmailId => id in templates

export function renderEmail<Id extends EmailId>(
  id: Id,
  props: Parameters<(typeof templates)[Id]>[0],
  ctx: EmailTemplateContext
): RenderedTemplate {
  const tpl = templates[id] as EmailTemplate<typeof props>
  const out = tpl(props, ctx)
  const external = isExternalEmail(id)
  const html = renderLayoutHtml({
    preheader: out.preheader,
    bodyHtml: out.html,
    unsubscribeUrl: ctx.unsubscribeUrl,
    recipientEmail: ctx.recipientEmail,
    baseUrl: ctx.baseUrl,
    external
  })
  const text = renderLayoutText({
    bodyText: out.text,
    unsubscribeUrl: ctx.unsubscribeUrl,
    recipientEmail: ctx.recipientEmail,
    external
  })
  return { subject: out.subject, html, text }
}
