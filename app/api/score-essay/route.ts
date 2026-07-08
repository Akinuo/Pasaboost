// ============================================================
// POST /api/score-essay
//
// This single Next.js Route Handler replaces the entire separate
// backend from the previous architecture (no Express server, no
// Cloudflare Worker, no Railway/Render deployment needed). It runs
// as a serverless function on Vercel, right next to the frontend.
//
// Security:
//   - Reads the Supabase session from cookies (no manual token passing)
//   - GROQ_API_KEY lives only in server environment variables
//   - Rate-limited using existing `scores` table (no extra infra)
//   - Input validated with Zod before any AI call is made
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getRecentScoreCount } from '@/lib/queries'

export const runtime = 'nodejs' // groq-sdk needs Node APIs, not Edge

const MAX_REQUESTS_PER_HOUR = 20

const ScoreEssaySchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters').max(10000, 'Essay must be under 10,000 characters'),
  prompt: z.string().max(500).optional(),
  examType: z.enum(['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']),
})

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ============================================================
// Groq scoring call
// ============================================================

async function scoreEssayWithGroq(essay: string, prompt: string | undefined, examType: string) {
  const systemPrompt = `You are an expert evaluator for Philippine college entrance examinations (${examType}).
Score the student's essay on these 5 dimensions, each out of 20 points (total 100):

1. Content (20pts): Relevance, depth, development of ideas, use of examples
2. Organization (20pts): Introduction, body paragraphs, conclusion, logical structure
3. Grammar (20pts): Sentence construction, grammar accuracy, punctuation, vocabulary
4. Coherence (20pts): Flow of ideas, transitions, unity, paragraph coherence
5. Argument (20pts): Clarity of thesis, strength of reasoning, persuasiveness

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "rubricScores": [
    {"dimension":"Content","score":<1-20>,"feedback":"<specific>","strengths":["..."],"weaknesses":["..."]},
    {"dimension":"Organization","score":<1-20>,"feedback":"<specific>","strengths":["..."],"weaknesses":["..."]},
    {"dimension":"Grammar","score":<1-20>,"feedback":"<specific>","strengths":["..."],"weaknesses":["..."]},
    {"dimension":"Coherence","score":<1-20>,"feedback":"<specific>","strengths":["..."],"weaknesses":["..."]},
    {"dimension":"Argument","score":<1-20>,"feedback":"<specific>","strengths":["..."],"weaknesses":["..."]}
  ],
  "overallFeedback": "<2-3 sentence overall assessment>",
  "strengths": ["<overall strength 1>", "<overall strength 2>"],
  "weaknesses": ["<overall weakness 1>", "<overall weakness 2>"],
  "suggestions": ["<actionable 1>", "<actionable 2>", "<actionable 3>"],
  "paragraphRewrites": [
    {
      "original": "<one of the weaker paragraphs verbatim>",
      "rewritten": "<significantly improved version>",
      "explanation": "<why this rewrite is better>",
      "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
    }
  ]
}`

  const userMessage = prompt ? `Essay Prompt: ${prompt}\n\nStudent Essay:\n${essay}` : `Student Essay:\n${essay}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content
  if (!responseText) throw new Error('Empty response from AI')

  let parsed: any
  try {
    parsed = JSON.parse(responseText)
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid JSON response from AI')
    parsed = JSON.parse(match[0])
  }

  const rubricScores = (parsed.rubricScores || []).map((r: any) => ({
    dimension: r.dimension,
    score: Math.max(1, Math.min(20, parseInt(r.score) || 10)),
    maxScore: 20,
    feedback: r.feedback || '',
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
  }))

  const totalScore = rubricScores.reduce((sum: number, r: any) => sum + r.score, 0)

  const band =
    totalScore >= 90 ? 'Excellent (90-100)' :
    totalScore >= 75 ? 'Proficient (75-89)' :
    totalScore >= 60 ? 'Developing (60-74)' :
    totalScore >= 45 ? 'Beginning (45-59)' : 'Needs Improvement (<45)'

  return {
    rubricScores,
    totalScore,
    overallFeedback: parsed.overallFeedback || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
    paragraphRewrites: Array.isArray(parsed.paragraphRewrites) ? parsed.paragraphRewrites.slice(0, 2) : [],
    estimatedBand: band,
    modelVersion: 'llama-3.3-70b-versatile',
  }
}

// ============================================================
// Route handler
// ============================================================

export async function POST(req: NextRequest) {
  // ── 1. Verify Supabase session (reads the httpOnly cookie) ──
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to score an essay.' }, { status: 401 })
  }

  // ── 2. Rate limit: max 20 scored essays per hour per user ───
  // Uses the existing `scores` table — no separate Redis/KV needed.
  const recentCount = await getRecentScoreCount(supabase, user.id)
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return NextResponse.json(
      { success: false, error: 'Too many scoring requests this hour. Please wait before trying again.' },
      { status: 429 }
    )
  }

  // ── 3. Validate input ────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = ScoreEssaySchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }
  const { essay, prompt, examType } = parseResult.data

  // ── 4. Call Groq ──────────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Scoring service is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  try {
    const scoreData = await scoreEssayWithGroq(essay, prompt, examType)

    return NextResponse.json({
      success: true,
      score: {
        userId: user.id,
        essay,
        prompt,
        examType,
        ...scoreData,
      },
      rateLimitRemaining: MAX_REQUESTS_PER_HOUR - recentCount - 1,
    })
  } catch (err: any) {
    console.error('Groq scoring error:', err?.message || err)

    if (err?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'AI service rate limit reached. Please try again in a minute.' },
        { status: 429 }
      )
    }

    return NextResponse.json({ success: false, error: 'Failed to score essay. Please try again.' }, { status: 500 })
  }
}

// GET is not supported — return a friendly message instead of a bare 405
export async function GET() {
  return NextResponse.json({ error: 'Use POST to score an essay.' }, { status: 405 })
}
