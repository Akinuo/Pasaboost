// ============================================================
// POST /api/feedback-chat
//
// Powers the follow-up Q&A chat attached to a score's feedback:
// a student can ask "why did I lose points on Organization here?"
// and get an answer grounded in the actual rubric feedback for
// that score — not generic writing advice. Each thread is scoped
// to one score + one optional dimension, and the full history is
// persisted so it reads back the same way on a later visit.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getScore, getFeedbackQAMessages, getRecentFeedbackQACount } from '@/lib/queries'

export const runtime = 'nodejs'

const MAX_QUESTIONS_PER_HOUR = 30

const FeedbackChatSchema = z.object({
  scoreId: z.string().uuid(),
  dimension: z.enum(['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']).optional(),
  question: z.string().min(1, 'Ask a question first.').max(500, 'Keep the question under 500 characters.'),
})

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export async function POST(req: NextRequest) {
  // ── 1. Verify Supabase session ──────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to ask about your feedback.' }, { status: 401 })
  }

  // ── 2. Rate limit ────────────────────────────────────────────
  const recentCount = await getRecentFeedbackQACount(supabase, user.id)
  if (recentCount >= MAX_QUESTIONS_PER_HOUR) {
    return NextResponse.json(
      { success: false, error: 'Too many questions this hour. Please wait before asking more.' },
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

  const parseResult = FeedbackChatSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }
  const { scoreId, dimension, question } = parseResult.data

  // ── 4. Load the score and confirm it belongs to this user ────
  const score = await getScore(supabase, scoreId)
  if (!score || score.userId !== user.id) {
    return NextResponse.json({ success: false, error: 'Score not found.' }, { status: 404 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Chat is not configured. Set GROQ_API_KEY on the server.' },
      { status: 503 }
    )
  }

  // ── 5. Build the grounding context for this thread ───────────
  let contextBlock: string
  if (dimension) {
    const rubric = score.rubricScores.find((r) => r.dimension === dimension)
    if (!rubric) {
      return NextResponse.json({ success: false, error: 'Unknown dimension for this score.' }, { status: 400 })
    }
    contextBlock = `Dimension: ${rubric.dimension} — scored ${rubric.score}/20
Feedback given: ${rubric.feedback}
Strengths noted: ${rubric.strengths.join('; ') || 'none noted'}
Weaknesses noted: ${rubric.weaknesses.join('; ') || 'none noted'}`
  } else {
    contextBlock = `Overall score: ${score.totalScore}/100 (${score.estimatedBand})
Overall feedback: ${score.overallFeedback}
Overall strengths: ${score.strengths.join('; ') || 'none noted'}
Overall weaknesses: ${score.weaknesses.join('; ') || 'none noted'}
Per-dimension scores: ${score.rubricScores.map((r) => `${r.dimension} ${r.score}/20`).join(', ')}`
  }

  const systemPrompt = `You are a helpful, direct writing coach for Philippine college entrance exam prep (${score.examType}). A student is asking a follow-up question about feedback they already received on one of their essays. Answer ONLY based on the grounding data below — you are explaining and elaborating on an existing evaluation, not re-grading the essay or inventing new issues that weren't flagged.

${contextBlock}

Essay prompt: ${score.prompt || '(none given)'}
Full essay text (for reference when the student asks about a specific part):
${score.essay}

Rules:
- Be specific and concrete, referencing the actual feedback/strengths/weaknesses above.
- If the student asks something the feedback doesn't cover, say so honestly rather than making something up, but you may still offer general guidance on that dimension.
- Keep answers focused and conversational — 2-5 sentences unless the question needs a short list.
- Never restate the raw score numbers back at the student unless they ask about the number specifically; focus on the "why" and "how to improve."`

  // ── 6. Load prior thread turns for conversational context ────
  const priorMessages = await getFeedbackQAMessages(supabase, scoreId, dimension)
  const recentTurns = priorMessages.slice(-10) // cap context sent to the model

  const groq = getGroqClient()!
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentTurns.map((m) => ({ role: m.role, content: m.content } as const)),
        { role: 'user', content: question },
      ],
      temperature: 0.4,
      max_tokens: 600,
    })

    const answer = completion.choices[0]?.message?.content?.trim()
    if (!answer) throw new Error('Empty response from AI')

    // ── 7. Persist both turns so the thread reads back the same way ──
    const { data: inserted, error: insertError } = await supabase
      .from('feedback_qa_messages')
      .insert([
        { score_id: scoreId, user_id: user.id, dimension: dimension ?? null, role: 'user', content: question },
        { score_id: scoreId, user_id: user.id, dimension: dimension ?? null, role: 'assistant', content: answer },
      ])
      .select('*')

    if (insertError || !inserted) throw insertError ?? new Error('Failed to save message')

    const assistantRow = inserted.find((r) => r.role === 'assistant')!

    return NextResponse.json({
      success: true,
      message: {
        id: assistantRow.id,
        scoreId,
        userId: user.id,
        dimension,
        role: 'assistant',
        content: answer,
        createdAt: assistantRow.created_at,
      },
    })
  } catch (err: any) {
    console.error('Feedback chat error:', err?.message || err)
    if (err?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'AI service rate limit reached. Please try again in a minute.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ success: false, error: 'Failed to get an answer. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to ask a feedback question.' }, { status: 405 })
}
