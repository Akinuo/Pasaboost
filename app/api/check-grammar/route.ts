// ============================================================
// POST /api/check-grammar
//
// Lightweight, draft-time grammar/style check — deliberately
// separate from /api/score-essay. Students should be able to run
// this as often as they like while drafting without burning their
// hourly scoring quota or creating a permanent scored submission.
//
// Unlike the rubric scoring endpoint, this only returns flagged
// issues with a verbatim `replacement` string, so the editor can
// offer a one-click "Apply Fix" instead of just a description.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getRecentToolUsageCount, recordToolUsage } from '@/lib/queries'
import type { GrammarIssue, GrammarIssueType } from '@/types'

export const runtime = 'nodejs'

// Higher than score-essay/outline — this is meant to be run
// continuously while drafting, not just once per essay. Still
// capped so a runaway client loop can't hammer the Groq key.
const MAX_REQUESTS_PER_HOUR = 40

const CheckGrammarSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters').max(10000, 'Essay must be under 10,000 characters'),
})

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

const VALID_TYPES: GrammarIssueType[] = ['grammar', 'spelling', 'punctuation', 'style']

async function findGrammarIssues(essay: string): Promise<GrammarIssue[]> {
  const groq = getGroqClient()
  if (!groq) throw new Error('GROQ_API_KEY is not configured')

  const systemPrompt = `You are a meticulous proofreader reviewing a Filipino student's college-entrance-exam essay draft. Find real grammar, spelling, punctuation, and style issues — look closely, including subtler precision/style issues, not just outright errors.

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "issues": [
    {
      "type": "<one of: grammar, spelling, punctuation, style>",
      "excerpt": "<verbatim snippet (3-12 words) copied EXACTLY from the essay containing the issue>",
      "issue": "<short description of what's wrong>",
      "suggestion": "<short human-readable explanation of the fix>",
      "replacement": "<the EXACT corrected text that should replace the excerpt — must be a drop-in substitute, not an explanation>"
    }
  ]
}
Find up to 12 real issues. Both "excerpt" and "replacement" must be precise, literal text — "excerpt" copied character-for-character from the essay, "replacement" written so that essay.replace(excerpt, replacement) produces correct text.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Essay draft:\n\n${essay}` },
    ],
    temperature: 0.2,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content
  if (!text) return []

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return []
    parsed = JSON.parse(match[0])
  }

  const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : []

  return rawIssues
    .filter((g: any) => g && typeof g.excerpt === 'string' && essay.includes(g.excerpt))
    .slice(0, 12)
    .map((g: any) => ({
      type: VALID_TYPES.includes(g.type) ? g.type : 'grammar',
      excerpt: g.excerpt,
      issue: g.issue || '',
      suggestion: g.suggestion || '',
      replacement: typeof g.replacement === 'string' && g.replacement.length > 0 ? g.replacement : undefined,
    }))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to check grammar.' }, { status: 401 })
  }

  const recentCount = await getRecentToolUsageCount(supabase, user.id, 'check-grammar')
  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    return NextResponse.json(
      { success: false, error: 'Too many grammar checks this hour. Please wait before trying again.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = CheckGrammarSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Grammar check is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  try {
    const issues = await findGrammarIssues(parseResult.data.essay)
    await recordToolUsage(supabase, user.id, 'check-grammar')
    return NextResponse.json({ success: true, issues })
  } catch (err: any) {
    console.error('Grammar check error:', err?.message || err)

    if (err?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'AI service rate limit reached. Please try again in a minute.' },
        { status: 429 }
      )
    }

    return NextResponse.json({ success: false, error: 'Failed to check grammar. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to check grammar.' }, { status: 405 })
}
