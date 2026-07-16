import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { escapeHtml, sendViaEmailJs, getEmailJsCredentialsFromEnv } from './email'

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;'
    )
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Hello, PasaBoost!')).toBe('Hello, PasaBoost!')
  })
})

describe('getEmailJsCredentialsFromEnv', () => {
  const keys = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY'] as const
  const original: Partial<Record<(typeof keys)[number], string | undefined>> = {}

  beforeEach(() => {
    for (const k of keys) {
      original[k] = process.env[k]
      process.env[k] = `test-${k}`
    }
  })

  afterEach(() => {
    for (const k of keys) {
      if (original[k] === undefined) delete process.env[k]
      else process.env[k] = original[k]
    }
  })

  it('returns all four credentials when every env var is set', () => {
    expect(getEmailJsCredentialsFromEnv()).toEqual({
      serviceId: 'test-EMAILJS_SERVICE_ID',
      templateId: 'test-EMAILJS_TEMPLATE_ID',
      publicKey: 'test-EMAILJS_PUBLIC_KEY',
      privateKey: 'test-EMAILJS_PRIVATE_KEY',
    })
  })

  it('returns null when any single env var is missing', () => {
    delete process.env.EMAILJS_PRIVATE_KEY
    expect(getEmailJsCredentialsFromEnv()).toBeNull()
  })
})

describe('sendViaEmailJs', () => {
  const creds = { serviceId: 's', templateId: 't', publicKey: 'pub', privateKey: 'priv' }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to the EmailJS REST endpoint with the expected payload shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'OK' })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendViaEmailJs(creds, { to: 'student@example.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result).toEqual({ ok: true, status: 200, body: 'OK' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.emailjs.com/api/v1.0/email/send')

    const body = JSON.parse(options.body)
    expect(body.service_id).toBe('s')
    expect(body.template_id).toBe('t')
    expect(body.user_id).toBe('pub')
    expect(body.accessToken).toBe('priv')
    expect(body.template_params).toEqual({
      to_email: 'student@example.com',
      subject: 'Hi',
      html_body: '<p>Hi</p>',
    })
  })

  it('surfaces a non-ok response instead of throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'Bad template' })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendViaEmailJs(creds, { to: 'x@example.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result).toEqual({ ok: false, status: 422, body: 'Bad template' })
  })
})
