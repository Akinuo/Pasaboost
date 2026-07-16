// ============================================================
// Integration tests for GET/POST /api/send-inactivity-reminders
//
// The one piece of logic here worth being paranoid about is the
// dedup: this route must send AT MOST ONE reminder per inactivity
// streak, or an inactive student gets emailed every single day
// forever. Most of these tests exist to pin that down.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---- A tiny fake Supabase query builder --------------------------
//
// Supports exactly the chains this route uses:
//   .from('profiles').select(...).eq('email_notifications', true)
//   .from('user_stats').select(...).eq('user_id', id).single()
//   .from('profiles').update({...}).eq('id', id)
// and is awaitable (implements `.then`), same as the real client.

interface FakeProfile {
  id: string
  display_name: string | null
  exam_type: string | null
  exam_date: string | null
  last_inactivity_reminder_sent_at: string | null
  email_notifications: boolean
}

interface FakeStats {
  last_activity: string | null
  total_essays: number
}

function makeSupabaseMock(opts: {
  profiles: FakeProfile[]
  statsByUserId: Record<string, FakeStats>
  emailByUserId: Record<string, string>
}) {
  const updateCalls: { id: string; patch: Record<string, unknown> }[] = []

  function from(table: string) {
    const state: { eqFilters: [string, unknown][]; isUpdate: boolean; updatePatch: Record<string, unknown> | null } = {
      eqFilters: [],
      isUpdate: false,
      updatePatch: null,
    }

    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        state.eqFilters.push([col, val])
        return builder
      },
      single: () => builder,
      update: (patch: Record<string, unknown>) => {
        state.isUpdate = true
        state.updatePatch = patch
        return builder
      },
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        try {
          resolve(resolveQuery(table, state))
        } catch (e) {
          reject(e)
        }
      },
    }
    return builder
  }

  function resolveQuery(table: string, state: { eqFilters: [string, unknown][]; isUpdate: boolean; updatePatch: Record<string, unknown> | null }) {
    if (table === 'profiles' && state.isUpdate) {
      const idFilter = state.eqFilters.find(([c]) => c === 'id')
      updateCalls.push({ id: idFilter?.[1] as string, patch: state.updatePatch! })
      return { error: null }
    }
    if (table === 'profiles') {
      const emailNotifFilter = state.eqFilters.find(([c]) => c === 'email_notifications')
      const rows = emailNotifFilter ? opts.profiles.filter((p) => p.email_notifications === emailNotifFilter[1]) : opts.profiles
      return { data: rows, error: null }
    }
    if (table === 'user_stats') {
      const userIdFilter = state.eqFilters.find(([c]) => c === 'user_id')
      const stats = opts.statsByUserId[userIdFilter?.[1] as string]
      return { data: stats ?? null, error: null }
    }
    throw new Error(`Unhandled table in mock: ${table}`)
  }

  return {
    updateCalls,
    client: {
      from,
      auth: {
        admin: {
          getUserById: async (id: string) => {
            const email = opts.emailByUserId[id]
            if (!email) return { data: { user: null }, error: { message: 'not found' } }
            return { data: { user: { id, email } }, error: null }
          },
        },
      },
    },
  }
}

// ---- Mocks --------------------------------------------------

const mockCreateServiceRoleClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}))

const mockSendViaEmailJs = vi.fn()
vi.mock('@/lib/email', () => ({
  sendViaEmailJs: (...args: unknown[]) => mockSendViaEmailJs(...args),
  escapeHtml: (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)),
  getEmailJsCredentialsFromEnv: () => mockGetCreds(),
}))
const mockGetCreds = vi.fn()

const { GET } = await import('./route')

const VALID_CREDS = { serviceId: 's', templateId: 't', publicKey: 'p', privateKey: 'k' }

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString()
}

function makeCronRequest() {
  return new NextRequest('http://localhost/api/send-inactivity-reminders', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
  mockGetCreds.mockReturnValue(VALID_CREDS)
  mockSendViaEmailJs.mockResolvedValue({ ok: true, status: 200, body: 'OK' })
})

describe('GET /api/send-inactivity-reminders — auth & config', () => {
  it('returns 401 when the cron secret does not match', async () => {
    const req = new NextRequest('http://localhost/api/send-inactivity-reminders', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 503 when EmailJS is not configured', async () => {
    mockGetCreds.mockReturnValue(null)
    mockCreateServiceRoleClient.mockReturnValue(makeSupabaseMock({ profiles: [], statsByUserId: {}, emailByUserId: {} }).client)

    const res = await GET(makeCronRequest())

    expect(res.status).toBe(503)
    expect(mockSendViaEmailJs).not.toHaveBeenCalled()
  })
})

describe('GET /api/send-inactivity-reminders — eligibility', () => {
  it('sends a reminder to a student inactive for exactly the threshold (3 days) with no prior reminder', async () => {
    const { client, updateCalls } = makeSupabaseMock({
      profiles: [
        {
          id: 'u1', display_name: 'Ana', exam_type: null, exam_date: null,
          last_inactivity_reminder_sent_at: null, email_notifications: true,
        },
      ],
      statsByUserId: { u1: { last_activity: daysAgo(3), total_essays: 5 } },
      emailByUserId: { u1: 'ana@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(mockSendViaEmailJs).toHaveBeenCalledTimes(1)
    expect(mockSendViaEmailJs.mock.calls[0][1].to).toBe('ana@example.com')
    // Records the reminder so the next run doesn't resend it.
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toMatchObject({ id: 'u1' })
    expect(updateCalls[0].patch.last_inactivity_reminder_sent_at).toBeTypeOf('string')
  })

  it('skips a student inactive for fewer than the threshold days', async () => {
    const { client } = makeSupabaseMock({
      profiles: [{ id: 'u1', display_name: 'Ben', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: true }],
      statsByUserId: { u1: { last_activity: daysAgo(2), total_essays: 5 } },
      emailByUserId: { u1: 'ben@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.skipped).toBe(1)
    expect(json.sent).toBe(0)
    expect(mockSendViaEmailJs).not.toHaveBeenCalled()
  })

  it('skips a student who has never submitted an essay, even if user_stats.last_activity is old', async () => {
    const { client } = makeSupabaseMock({
      profiles: [{ id: 'u1', display_name: 'Cara', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: true }],
      statsByUserId: { u1: { last_activity: daysAgo(10), total_essays: 0 } },
      emailByUserId: { u1: 'cara@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.skipped).toBe(1)
    expect(mockSendViaEmailJs).not.toHaveBeenCalled()
  })

  it('only queries profiles opted in to email_notifications', async () => {
    const { client } = makeSupabaseMock({
      profiles: [
        { id: 'u1', display_name: 'Opted In', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: true },
        { id: 'u2', display_name: 'Opted Out', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: false },
      ],
      statsByUserId: {
        u1: { last_activity: daysAgo(5), total_essays: 5 },
        u2: { last_activity: daysAgo(5), total_essays: 5 },
      },
      emailByUserId: { u1: 'in@example.com', u2: 'out@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    // u2 is filtered out at the query level (the `.eq('email_notifications', true)`
    // in the mock), so total only reflects opted-in profiles.
    expect(json.total).toBe(1)
    expect(json.sent).toBe(1)
    expect(mockSendViaEmailJs).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/send-inactivity-reminders — once-per-streak dedup', () => {
  it('does NOT resend when a reminder was already sent after the last activity (still the same streak)', async () => {
    const { client } = makeSupabaseMock({
      profiles: [
        {
          id: 'u1', display_name: 'Dan', exam_type: null, exam_date: null,
          last_inactivity_reminder_sent_at: daysAgo(1), // reminded yesterday
          email_notifications: true,
        },
      ],
      // last wrote 5 days ago — the reminder sent 1 day ago is AFTER that,
      // so this streak has already been nudged once.
      statsByUserId: { u1: { last_activity: daysAgo(5), total_essays: 5 } },
      emailByUserId: { u1: 'dan@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.skipped).toBe(1)
    expect(json.sent).toBe(0)
    expect(mockSendViaEmailJs).not.toHaveBeenCalled()
  })

  it('DOES send again once the student has written since the last reminder and gone quiet again', async () => {
    const { client } = makeSupabaseMock({
      profiles: [
        {
          id: 'u1', display_name: 'Eve', exam_type: null, exam_date: null,
          last_inactivity_reminder_sent_at: daysAgo(10), // an old reminder, from a previous streak
          email_notifications: true,
        },
      ],
      // wrote again 4 days ago (after that old reminder), then went quiet
      statsByUserId: { u1: { last_activity: daysAgo(4), total_essays: 6 } },
      emailByUserId: { u1: 'eve@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(mockSendViaEmailJs).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/send-inactivity-reminders — email lookup & delivery failures', () => {
  it('skips a profile whose auth email cannot be found', async () => {
    const { client } = makeSupabaseMock({
      profiles: [{ id: 'u1', display_name: 'Frank', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: true }],
      statsByUserId: { u1: { last_activity: daysAgo(5), total_essays: 3 } },
      emailByUserId: {}, // no email on file
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.skipped).toBe(1)
    expect(mockSendViaEmailJs).not.toHaveBeenCalled()
  })

  it('counts a failed EmailJS send as failed, not sent, and does not record a reminder timestamp for it', async () => {
    mockSendViaEmailJs.mockResolvedValue({ ok: false, status: 500, body: 'boom' })
    const { client, updateCalls } = makeSupabaseMock({
      profiles: [{ id: 'u1', display_name: 'Gigi', exam_type: null, exam_date: null, last_inactivity_reminder_sent_at: null, email_notifications: true }],
      statsByUserId: { u1: { last_activity: daysAgo(5), total_essays: 3 } },
      emailByUserId: { u1: 'gigi@example.com' },
    })
    mockCreateServiceRoleClient.mockReturnValue(client)

    const res = await GET(makeCronRequest())
    const json = await res.json()

    expect(json.failed).toBe(1)
    expect(json.sent).toBe(0)
    expect(updateCalls).toHaveLength(0)
  })
})
