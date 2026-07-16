// ============================================================
// Shared EmailJS sending helper.
//
// Used by every cron route that sends email (send-weekly-emails,
// send-inactivity-reminders, and any future one) so there's a single
// place that knows how to talk to EmailJS's REST API, a single HTML
// escaper, and a single spot to read the four EMAILJS_* env vars.
// Extracted out of send-weekly-emails/route.ts, which used to define
// all of this locally.
// ============================================================

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send'

export interface EmailJsSendResult {
  ok: boolean
  status: number
  body: string
}

export interface EmailJsCredentials {
  serviceId: string
  templateId: string
  publicKey: string
  privateKey: string
}

// EmailJS's REST endpoint is the same one their browser SDK hits — from a
// server we skip the origin check by passing the Private Key as
// `accessToken` alongside the Public Key. The template referenced by
// EMAILJS_TEMPLATE_ID must have a variable (we use `html_body`) with
// "Insert as HTML" enabled in the EmailJS template editor, or the markup
// passed in here will show up as literal tags in the inbox instead of
// rendering. All server-sent email (weekly digest, inactivity nudges)
// reuses this same one template — only `html_body`/`subject` change.
export async function sendViaEmailJs(
  creds: EmailJsCredentials,
  params: { to: string; subject: string; html: string }
): Promise<EmailJsSendResult> {
  const res = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: creds.serviceId,
      template_id: creds.templateId,
      user_id: creds.publicKey,
      accessToken: creds.privateKey,
      template_params: {
        to_email: params.to,
        subject: params.subject,
        html_body: params.html,
      },
    }),
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

// Reads the four EMAILJS_* env vars and returns them together, or null if
// any is missing — so every call site can do one config check instead of
// repeating the four-way `if (!a || !b || !c || !d)` each time.
export function getEmailJsCredentialsFromEnv(): EmailJsCredentials | null {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  if (!serviceId || !templateId || !publicKey || !privateKey) return null
  return { serviceId, templateId, publicKey, privateKey }
}
