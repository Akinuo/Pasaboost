// ============================================================
// POST /api/score-drill
//
// Scores a single Weakness-Targeted Drill Mode attempt — one
// rubric dimension only, not the full 5-dimension essay rubric.
// Modeled on /api/score-essay but deliberately smaller/cheaper:
// shorter prompt, lower max_tokens, since the response being
// graded is a short exercise (60-160 words), not a full essay.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getRecentDrillCount } from '@/lib/queries'

export const runtime = 'nodejs'

const MAX_REQUESTS_PER_HOUR = 30

const ScoreDrillSchema = z.object({
  dimension: z.enum(['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']),
  exerciseInstructions: z.string().min(10).max(1000),
  seedText: z.string().max(2000).optional(),
  response: z.string().min(20, 'Response is too short to score').max(2500),
})

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

const DIMENSION_FOCUS: Record<string, string> = {
  Content: 'ONLY how specific, relevant, and well-developed the ideas/evidence are. Ignore grammar and sentence-level polish.',
  Organization: 'ONLY structure — clear topic/closing sentences, logical ordering, paragraph shape. Ignore grammar and word choice.',
  Grammar: 'ONLY grammar, punctuation, spelling, and sentence mechanics. Ignore whether the content itself is interesting.',
  Coherence: 'ONLY how smoothly ideas connect — transitions, logical flow between sentences. Ignore grammar and depth of content.',
  Argument: 'ONLY the strength and clarity of the thesis/claim and how well it is supported. Ignore grammar and organization.',
}

async function scoreDrillWithGroq(dimension: string, instructions: string, seedText: string | undefined, response: string) {
  const systemPrompt = `You are a strict, demanding evaluator for Philippine college entrance examination essay writing. A student just completed a SHORT, FOCUSED drill exercise targeting ONE rubric dimension: ${dimension}.

Score their response ${DIMENSION_FOCUS[dimension] || ''}

Score out of 20, using these anchors (apply strictly, don't inflate):
- 18-20: Exceptional, near-flawless for this dimension.
- 14-17: Solid, clearly competent with only minor issues.
- 10-13: Average — gets the job done but generic or has noticeable issues.
- 6-9: Below average — significant weaknesses.
- 1-5: Poor — the dimension is largely absent or fundamentally flawed.

Respond with ONLY valid JSON (no markdown):
{
  "score": <1-20>,
  "feedback": "<3-5 sentences, specific and direct about this ONE dimension only>",
  "tip": "<one concrete, actionable tip for next time>"
}`

  const userMessage = [
    `Exercise: ${instructions}`,
    seedText ? `\nOriginal text given to the student:\n${seedText}` : '',
    `\nStudent's response:\n${response}`,
  ].filter(Boolean).join('\n')

  const groq = getGroqClient()
  if (!groq) throw new Error('GROQ_API_KEY is not configured')

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Empty response from AI')

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid JSON response from AI')
    parsed = JSON.parse(match[0])
  }

  return {
    score: Math.max(1, Math.min(20, parseInt(parsed.score) || 10)),
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    tip: typeof parsed.tip === 'string' ? parsed.tip : undefined,
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to score a drill.' }, { status: 401 })
  }

  const recentCount = await getRecentDrillCount(supabase, user.id)
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return NextResponse.json(
      { success: false, error: 'Too many drill attempts this hour. Please wait before trying again.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = ScoreDrillSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }
  const { dimension, exerciseInstructions, seedText, response } = parseResult.data

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Scoring service is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  try {
    const result = await scoreDrillWithGroq(dimension, exerciseInstructions, seedText, response)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Groq drill scoring error:', err?.message || err)
    if (err?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'AI service rate limit reached. Please try again in a minute.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ success: false, error: 'Failed to score drill. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to score a drill attempt.' }, { status: 405 })
}
