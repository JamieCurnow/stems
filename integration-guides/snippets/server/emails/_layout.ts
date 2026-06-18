/**
 * Shared HTML chrome for every email. Replace the brand colours, name, and
 * tagline with your own.
 */

export interface LayoutArgs {
  preheader?: string
  bodyHtml: string                  // already escaped/authored by the template
  unsubscribeUrl: string
  recipientEmail: string
  baseUrl: string
}

export interface LayoutTextArgs {
  bodyText: string
  unsubscribeUrl: string
  recipientEmail: string
}

export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export function renderLayoutHtml({
  preheader, bodyHtml, unsubscribeUrl, recipientEmail, baseUrl
}: LayoutArgs): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#FFFFFF;line-height:1px;">${escapeHtml(preheader)}</div>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>{{APP_NAME}}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F4;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1B1B1B;-webkit-font-smoothing:antialiased;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F4;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #E5E5E5;">
            <a href="${escapeHtml(baseUrl)}" style="color:#1B1B1B;text-decoration:none;font-family:Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-0.01em;">{{APP_NAME}}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-size:16px;line-height:1.55;color:#1B1B1B;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #E5E5E5;font-size:12px;line-height:1.6;color:#6B6B6B;">
            <p style="margin:0 0 12px;">{{APP_NAME}}. Replace this tagline with your own.</p>
            <p style="margin:0 0 4px;">You're getting this at <a href="mailto:${escapeHtml(recipientEmail)}" style="color:#6B6B6B;">${escapeHtml(recipientEmail)}</a>.</p>
            <p style="margin:0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#0066CC;text-decoration:underline;">Unsubscribe</a> &middot; <a href="${escapeHtml(baseUrl)}/settings" style="color:#0066CC;text-decoration:underline;">Email preferences</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function renderLayoutText({ bodyText, unsubscribeUrl, recipientEmail }: LayoutTextArgs): string {
  return `${bodyText.trim()}

{{APP_NAME}}

You're getting this at ${recipientEmail}.
Unsubscribe: ${unsubscribeUrl}
`
}
