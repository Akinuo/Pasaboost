// ============================================================
// Integration tests for POST /api/score-essay
//
// Covers the four things that can take this endpoint down or make
// it misbehave in production, none of which were under test before:
//   1. Auth gate       — unauthenticated requests must never reach Groq
//   2. Rate limiting    — the 20/hour cap, and that it's enforced
//                          BEFORE input validation (fails closed)
//   3. Input validation — malformed JSON / bad body shape rejected
//   4. Service + upstream failures — missing GROQ_API_KEY, Groq
//                          throwing, Groq itself rate-limiting us
//
// Supabase, the query layer, and the Groq SDK are all mocked — this
// is a route-logic test, not an end-to-end test against real infra.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Mocks --------------------------------------------------

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

const mockGetRecentScoreCount = vi.fn()
vi.mock('@/lib/queries', () => ({
  getRecentScoreCount: (...args: unknown[]) => mockGetRecentScoreCount(...args),
}))

const mockGroqCreate = vi.fn()
vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = { completions: { create: (...args: unknown[]) => mockGroqCreate(...args) } }
  },
}))

// Imported after the mocks above so the route picks them up.
const { POST, GET } = await import('./route')

// ---- Fixtures -------------------------------------------------

const VALID_ESSAY = 'This is a sufficiently long essay body. '.repeat(3) // > 50 chars
const VALID_BODY = { essay: VALID_ESSAY, examType: 'UPCAT' as const }

const VALID_AI_JSON = JSON.stringify({
  rubricScores: [
    { dimension: 'Content', score: 15, feedback: 'ok', strengths: ['clear'], weaknesses: ['thin'] },
    { dimension: 'Organization', score: 15, feedback: 'ok', strengths: ['clear'], weaknesses: ['thin'] },
    { dimension: 'Grammar', score: 15, feedback: 'ok', strengths: ['clear'], weaknesses: ['thin'] },
    { dimension: 'Coherence', score: 15, feedback: 'ok', strengths: ['clear'], weaknesses: ['thin'] },
    { dimension: 'Argument', score: 15, feedback: 'ok', strengths: ['clear'], weaknesses: ['thin'] },
  ],
  overallFeedback: 'Solid, competitive effort.',
  strengths: ['clear thesis'],
  weaknesses: ['thin evidence'],
  suggestions: ['add concrete examples'],
  paragraphRewrites: [],
  grammarIssues: [],
})

function makeRequest(body: unknown, { rawBody }: { rawBody?: string } = {}) {
  return new NextRequest('http://localhost/api/score-essay', {
    method: 'POST',
    body: rawBody ?? JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GROQ_API_KEY = 'test-key'
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockGetRecentScoreCount.mockResolvedValue(0)
  mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: VALID_AI_JSON } }] })
})

// ---- Auth -------------------------------------------------

describe('POST /api/score-essay — auth gate', () => {
  it('returns 401 when there is no signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('never calls Groq or checks rate limits for an unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await POST(makeRequest(VALID_BODY))

    expect(mockGetRecentScoreCount).not.toHaveBeenCalled()
    expect(mockGroqCreate).not.toHaveBeenCalled()
  })
})

// ---- Rate limiting -------------------------------------------------

describe('POST /api/score-essay — rate limiting', () => {
  it('returns 429 once the signed-in user has hit the hourly cap', async () => {
    mockGetRecentScoreCount.mockResolvedValue(20)

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(429)
    expect(mockGroqCreate).not.toHaveBeenCalled()
  })

  it('allows a request through just under the cap and reports the correct remaining count', async () => {
    mockGetRecentScoreCount.mockResolvedValue(19)

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rateLimitRemaining).toBe(0)
  })

  it('checks the rate limit before validating input, so it fails closed even on a bad body', async () => {
    mockGetRecentScoreCount.mockResolvedValue(20)

    const res = await POST(makeRequest({ essay: 'way too short' }))

    // Must still be 429, not 400 — proves the ordering (rate limit → validation)
    // rather than validation silently short-circuiting the limit check.
    expect(res.status).toBe(429)
  })
})

// ---- Input validation -------------------------------------------------

describe('POST /api/score-essay — input validation', () => {
  it('rejects essays under the 50-character minimum', async () => {
    const res = await POST(makeRequest({ essay: 'too short', examType: 'UPCAT' }))
    expect(res.status).toBe(400)
  })

  it('rejects an essay over the 10,000-character maximum', async () => {
    const res = await POST(makeRequest({ essay: 'x'.repeat(10001), examType: 'UPCAT' }))
    expect(res.status).toBe(400)
  })

  it('rejects an unrecognized examType', async () => {
    const res = await POST(makeRequest({ essay: VALID_ESSAY, examType: 'NOT_A_REAL_EXAM' }))
    expect(res.status).toBe(400)
  })

  it('rejects malformed JSON bodies instead of throwing', async () => {
    const res = await POST(makeRequest(undefined, { rawBody: '{not valid json' }))
    expect(res.status).toBe(400)
  })
})

// ---- Service configuration -------------------------------------------------

describe('POST /api/score-essay — service configuration', () => {
  it('returns 503 when GROQ_API_KEY is not set on the server', async () => {
    delete process.env.GROQ_API_KEY

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(503)
    expect(mockGroqCreate).not.toHaveBeenCalled()
  })
})

// ---- Happy path -------------------------------------------------

describe('POST /api/score-essay — happy path', () => {
  it('scores a valid essay from a signed-in, under-limit user', async () => {
    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.score.userId).toBe('user-1')
    expect(json.score.totalScore).toBe(75)
    expect(json.score.estimatedBand).toBe('Proficient (75-89)')
    expect(json.score.rubricScores).toHaveLength(5)
  })
})

// ---- Upstream failures -------------------------------------------------

describe('POST /api/score-essay — upstream Groq failures', () => {
  it('returns 500 when Groq throws an unexpected error', async () => {
    mockGroqCreate.mockRejectedValue(new Error('upstream boom'))

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it("passes through Groq's own 429 as a 429 to the client", async () => {
    mockGroqCreate.mockRejectedValue({ status: 429 })

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(429)
  })

  it('returns 500 when Groq responds with an empty message', async () => {
    mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: null } }] })

    const res = await POST(makeRequest(VALID_BODY))

    expect(res.status).toBe(500)
  })
})

// ---- Method handling -------------------------------------------------

describe('GET /api/score-essay', () => {
  it('returns 405 with a friendly message instead of a bare error', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})
