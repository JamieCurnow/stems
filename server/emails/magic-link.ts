import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

export interface MagicLinkProps {
  /** The Better Auth verify URL. Single-use, expires in 15 minutes. */
  url: string
}

const template: EmailTemplate<MagicLinkProps> = ({ url }) => {
  const href = escapeHtml(url)
  return {
    subject: 'Your Stems sign-in link',
    preheader: 'Tap to sign in. The link works once and expires in 15 minutes.',
    html: `
      <p>Hey,</p>
      <p>Here's your sign-in link. Tap it and you're in. No password to remember, nothing to type.</p>
      <p style="margin:28px 0;">
        <a href="${href}" style="display:inline-block;background:#E38475;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:9999px;font-weight:600;">Sign in to Stems</a>
      </p>
      <p style="font-size:14px;color:#6B6B6B;">The link works once and expires in 15 minutes. If the button doesn't work, paste this into your browser:</p>
      <p style="font-size:13px;color:#6B6B6B;word-break:break-all;">${href}</p>
      <p>If you didn't ask to sign in, you can ignore this. Nothing happens until the link is used.</p>
    `,
    text: `Hey,

Here's your sign-in link. Open it and you're in. No password to remember, nothing to type.

${url}

The link works once and expires in 15 minutes.

If you didn't ask to sign in, you can ignore this. Nothing happens until the link is used.`
  }
}

export default template
