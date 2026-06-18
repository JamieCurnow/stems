import type { EmailTemplate } from './_types'

export interface SystemTestProps {
  note?: string
}

const template: EmailTemplate<SystemTestProps> = ({ note }) => {
  const safe = note ? note.slice(0, 200) : null
  return {
    subject: 'Stems email pipeline test',
    preheader: 'A test from your Stems setup.',
    html: `
      <p>This is a test from the Stems email pipeline.</p>
      ${safe ? `<p>Note: <em>${safe}</em></p>` : ''}
      <p>If it landed, Resend and the from-domain are wired correctly.</p>
    `,
    text: `Stems email pipeline test.\n${safe ? `Note: ${safe}\n` : ''}\nIf this landed, Resend and the from-domain are wired correctly.`
  }
}

export default template
