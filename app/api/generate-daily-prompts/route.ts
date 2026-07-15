// ============================================================
// GET/POST /api/generate-daily-prompts
//
// Generates at least 5 new AI-written essay topics per day and
// stores them in `daily_prompts`, supplementing the static prompt
// library in lib/prompts.ts. Meant to be triggered by Vercel Cron
// (see vercel.json) once a day — not a normal user-facing route.
//
// Protected by CRON_SECRET: Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on its own cron requests, so
// this checks that header rather than requiring a signed-in user.
//
// Idempotent by design — if a batch already exists for today
// (Asia/Manila), it returns the existing batch instead of generating
// duplicates, unless ?force=true is passed (for manual regeneration).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { todayInManila } from '@/lib/utils'
import { AiDailyPromptsResponseSchema, AiGeneratedPromptSchema, parseAiJson, parseLenientArray } from '@/lib/aiSchemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_PROMPTS_PER_DAY = 5
const GENERATE_COUNT = 6 // small buffer above the minimum, in case one gets filtered out

const PROMPT_CATEGORIES = [
  'Social Issues', 'Science & Technology', 'Education', 'Environment',
  'Culture & Identity', 'Economics', 'Health', 'Government & Politics',
]
const EXAM_TYPES = ['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

// Today's date in Asia/Manila, as YYYY-MM-DD — see lib/utils.ts

interface GeneratedPrompt {
  text: string
  category: string
  examType: string[]
  difficulty: string
  keywords: string[]
  tip?: string
}

async function generatePrompts(existingTexts: string[]): Promise<GeneratedPrompt[]> {
  const groq = getGroqClient()
  if (!groq) throw new Error('GROQ_API_KEY is not configured')

  const avoidList = existingTexts.slice(0, 40) // keep the prompt from growing unbounded over time

  const systemPrompt = `You are a Filipino college-entrance-exam curriculum writer generating fresh essay topics for PasaBoost, an essay coaching tool for exams like UPCAT, ACET, DCAT, and USTET.

Generate exactly ${GENERATE_COUNT} NEW essay writing prompts for today. Requirements:
- Topics must be relevant to Filipino students and, where fitting, Philippine current events, culture, or society — not generic international filler.
- Spread across different categories from this list: ${PROMPT_CATEGORIES.join(', ')}.
- Spread across difficulty levels: ${DIFFICULTIES.join(', ')}.
- Each prompt's "examType" should be 1-3 exams from: ${EXAM_TYPES.join(', ')} — pick whichever genuinely fit the topic and register (General is a safe default for broadly-relevant topics).
- Each prompt must be a full, well-formed essay QUESTION or directive (one or two sentences), not just a topic label.
- Do NOT repeat or closely rephrase any of these already-used prompts:
${avoidList.map((t) => `- ${t}`).join('\n') || '(none yet)'}

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "prompts": [
    {
      "text": "<the full essay question>",
      "category": "<one of the categories above>",
      "examType": ["<1-3 of the exam types above>"],
      "difficulty": "<Beginner|Intermediate|Advanced>",
      "keywords": ["<3-5 short keywords>"],
      "tip": "<one short, concrete writing tip for this specific prompt>"
    }
  ]
}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }],
    temperature: 0.9, // want genuine day-to-day variety here, not deterministic output
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content
  if (!text) return []

  let parsed: z.infer<typeof AiDailyPromptsResponseSchema>
  try {
    parsed = AiDailyPromptsResponseSchema.parse(parseAiJson(text))
  } catch {
    return []
  }

  return parseLenientArray(AiGeneratedPromptSchema, parsed.prompts)
    .filter((p) => p.text.trim().length > 15)
    .map((p) => ({
      text: p.text.trim(),
      category: PROMPT_CATEGORIES.includes(p.category) ? p.category : 'Social Issues',
      examType: p.examType.length > 0
        ? p.examType.filter((e) => EXAM_TYPES.includes(e))
        : ['General'],
      difficulty: DIFFICULTIES.includes(p.difficulty) ? p.difficulty : 'Intermediate',
      keywords: p.keywords.slice(0, 5),
      tip: p.tip,
    }))
}

async function handleGenerate(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    console.warn('generate-daily-prompts: CRON_SECRET is not set — this route is currently unprotected.')
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Prompt generation is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  const force = req.nextUrl.searchParams.get('force') === 'true'
  const today = todayInManila()
  const supabase = createServiceRoleClient()

  const { data: existingToday, error: existingError } = await supabase
    .from('daily_prompts')
    .select('id')
    .eq('generated_date', today)

  if (existingError) {
    console.error('generate-daily-prompts: failed to check existing batch:', existingError.message)
    return NextResponse.json({ success: false, error: 'Database error checking existing batch.' }, { status: 500 })
  }

  if (existingToday && existingToday.length >= MIN_PROMPTS_PER_DAY && !force) {
    return NextResponse.json({
      success: true,
      generated: 0,
      skipped: true,
      message: `Today's batch already exists (${existingToday.length} prompts). Pass ?force=true to regenerate.`,
      date: today,
    })
  }

  // Pull a slice of recent prompt text so the model avoids near-duplicates day over day.
  const { data: recent } = await supabase
    .from('daily_prompts')
    .select('text')
    .order('created_at', { ascending: false })
    .limit(40)

  try {
    const generated = await generatePrompts((recent ?? []).map((r) => r.text))

    if (generated.length < MIN_PROMPTS_PER_DAY) {
      return NextResponse.json(
        { success: false, error: `AI only returned ${generated.length} usable prompts (need at least ${MIN_PROMPTS_PER_DAY}). Try again.` },
        { status: 502 }
      )
    }

    if (force && existingToday && existingToday.length > 0) {
      await supabase.from('daily_prompts').delete().eq('generated_date', today)
    }

    const { error: insertError } = await supabase.from('daily_prompts').insert(
      generated.map((p) => ({
        text: p.text,
        category: p.category,
        exam_type: p.examType,
        difficulty: p.difficulty,
        keywords: p.keywords,
        tip: p.tip ?? null,
        generated_date: today,
      }))
    )

    if (insertError) {
      console.error('generate-daily-prompts: insert failed:', insertError.message)
      return NextResponse.json({ success: false, error: 'Failed to save generated prompts.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, generated: generated.length, date: today })
  } catch (err: any) {
    console.error('generate-daily-prompts error:', err?.message || err)
    if (err?.status === 429) {
      return NextResponse.json({ success: false, error: 'AI service rate limit reached. Try again shortly.' }, { status: 429 })
    }
    return NextResponse.json({ success: false, error: 'Failed to generate prompts.' }, { status: 500 })
  }
}

// Vercel Cron makes a GET request by default.
export async function GET(req: NextRequest) {
  return handleGenerate(req)
}

// Also allow POST for manual/admin triggering with the same auth check.
export async function POST(req: NextRequest) {
  return handleGenerate(req)
}
