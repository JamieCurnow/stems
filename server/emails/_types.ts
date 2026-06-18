export interface RenderedTemplate {
  subject: string
  html: string
  text: string
  preheader?: string
}

export interface EmailTemplateContext {
  baseUrl: string
  recipientEmail: string
  unsubscribeUrl: string
}

export type EmailTemplate<P> = (props: P, ctx: EmailTemplateContext) => RenderedTemplate
