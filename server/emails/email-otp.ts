import type { EmailTemplate } from './_types'
import { escapeHtml } from './_layout'

export interface EmailOtpProps {
  /** The one-time sign-in code. Single-use, expires in 10 minutes. */
  code: string
}

const template: EmailTemplate<EmailOtpProps> = ({ code }) => {
  const safe = escapeHtml(code)
  return {
    subject: 'Your Stems sign-in code',
    preheader: `${code} is your sign-in code. It works once and expires in 10 minutes.`,
    html: `
      <p>Hey,</p>
      <p>Here's your sign-in code. Type it back into Stems and you're in.</p>
      <p style="margin:28px 0;text-align:center;">
        <span style="display:inline-block;background:#FBEDE9;color:#1F1B19;font-size:32px;font-weight:600;letter-spacing:8px;padding:16px 28px;border-radius:14px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${safe}</span>
      </p>
      <p style="font-size:14px;color:#6B6B6B;">The code works once and expires in 10 minutes.</p>
      <p>If you didn't ask to sign in, you can ignore this. Nothing happens until the code is used.</p>
    `,
    text: `Hey,

Here's your sign-in code. Type it back into Stems and you're in.

${code}

The code works once and expires in 10 minutes.

If you didn't ask to sign in, you can ignore this. Nothing happens until the code is used.`
  }
}

export default template
