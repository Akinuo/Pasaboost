// ============================================================
// POST /api/outline
//
// Generates a brainstorming outline (thesis suggestion, section
// structure, bullet points, transition tips) for a given essay
// prompt — BEFORE the student writes.
//
// Deliberately scoped to structure only, never full sentences or
// paragraphs: this is a coaching tool, not a ghostwriter, and it
// would undercut the AI-detector feature above to hand students
// pre-written prose to paste in.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import type { EssayOutline } from '@/types'

export const runtime = 'nodejs'

const OutlineSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(500),
  examType: z.enum(['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']),
})

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

async function generateOutline(prompt: string, examType: string): Promise<EssayOutline> {
  const groq = getGroqClient()
  if (!groq) throw new Error('GROQ_API_KEY is not configured')

  const systemPrompt = `You are an essay-writing coach helping a Filipino student brainstorm BEFORE they write, for the ${examType} college entrance exam. Give STRUCTURE ONLY — thesis angle, section headers, and short bullet-point ideas (max ~8 words each). NEVER write full sentences, paragraphs, or example essay text; the student must write it themselves. Respond with ONLY valid JSON:
{
  "thesisSuggestion": "<one short sentence suggesting a possible angle/position, phrased as a suggestion not a finished thesis>",
  "sections": [
    {"title": "Introduction", "points": ["<idea>", "<idea>"]},
    {"title": "Body Paragraph 1", "points": ["<idea>", "<idea>"]},
    {"title": "Body Paragraph 2", "points": ["<idea>", "<idea>"]},
    {"title": "Conclusion", "points": ["<idea>", "<idea>"]}
  ],
  "transitionTips": ["<short transition-word tip 1>", "<short transition-word tip 2>"]
}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Essay prompt: ${prompt}` },
    ],
    temperature: 0.5,
    max_tokens: 900,
    response_format: { type: 'json_object' },
  })

  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('Empty response from AI')

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid JSON response from AI')
    parsed = JSON.parse(match[0])
  }

  return {
    thesisSuggestion: parsed.thesisSuggestion || '',
    sections: Array.isArray(parsed.sections)
      ? parsed.sections.slice(0, 6).map((s: any) => ({
          title: s.title || 'Section',
          points: Array.isArray(s.points) ? s.points.slice(0, 5) : [],
        }))
      : [],
    transitionTips: Array.isArray(parsed.transitionTips) ? parsed.transitionTips.slice(0, 5) : [],
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to use the outline assistant.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = OutlineSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Outline service is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  try {
    const outline = await generateOutline(parseResult.data.prompt, parseResult.data.examType)
    return NextResponse.json({ success: true, outline })
  } catch (err: any) {
    console.error('Outline generation error:', err?.message || err)
    return NextResponse.json({ success: false, error: 'Failed to generate outline. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to generate an outline.' }, { status: 405 })
}
