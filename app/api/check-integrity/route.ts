// ============================================================
// POST /api/check-integrity
//
// Two checks in one call:
//  1. AI-generated text detection — a heuristic (stylometric)
//     score blended with an LLM judgment call via Groq. This is
//     an ESTIMATE, not a certainty — no detector (including
//     commercial ones) can prove AI authorship. We say so in the
//     response and in the UI.
//  2. Originality / self-plagiarism check — compares the essay
//     against the SAME STUDENT's own past submissions to catch
//     near-duplicate resubmissions. This is NOT an internet-wide
//     plagiarism scan (that needs a paid third-party index this
//     project doesn't have) — scoped honestly to what we can
//     actually check.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getUserScores } from '@/lib/queries'
import type { AIDetectionResult, AIDetectionVerdict, OriginalityResult } from '@/types'

export const runtime = 'nodejs'

const CheckSchema = z.object({
  essay: z.string().min(50, 'Essay must be at least 50 characters').max(10000, 'Essay must be under 10,000 characters'),
})

let _groq: Groq | null = null
function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// ============================================================
// 1. AI-detection heuristics (pure JS, no API cost)
// ============================================================

// Deliberately does NOT include ordinary transition words like
// "furthermore", "moreover", "in conclusion", or "on the other hand" —
// this platform actively coaches students to use them, so flagging
// them punishes exactly the well-structured writing we're teaching.
// These are phrases that lean generic/filler rather than standard
// academic connective tissue. Kept deliberately light-weight — see
// CHAT_LEAKAGE_PHRASES below for the much stronger signal.
const AI_STOCK_PHRASES = [
  'delve into', 'in today\'s society', 'in the fast-paced world',
  'as we navigate', 'in an era of', 'a testament to',
  'underscores the importance', 'in the realm of', 'ever-evolving',
  'multifaceted', 'plays a crucial role', 'this essay will explore',
  'in the tapestry of', 'stands as a', 'serves as a reminder',
]

// Near-certain evidence: leftover conversational wrapper text from
// pasting a chat assistant's reply directly. This is deliberately
// MODEL-AGNOSTIC — every chat AI product (ChatGPT, Claude, Gemini,
// Copilot, Llama-based assistants, DeepSeek, and anything built on
// top of them) produces some version of this framing when asked to
// "write an essay about X", regardless of which underlying model is
// doing the writing. Chasing one model's specific prose tics is a
// losing game since every new model release shifts them; catching the
// chat-interface artifacts themselves generalizes far better.
const CHAT_LEAKAGE_PHRASES = [
  'as an ai', 'as a language model', 'as a large language model',
  "i'm an ai", 'i am an ai', "i'm just an ai", 'i am just an ai',
  'i do not have personal experiences', "i don't have personal experiences",
  'i do not have personal opinions', "i don't have personal opinions",
  'i do not have feelings', "i don't have feelings",
  'my training data', 'my knowledge cutoff',
  'i hope this essay helps', 'i hope this helps',
  "let me know if you'd like", 'let me know if you need',
  'feel free to let me know', 'feel free to ask',
  'here is a revised version', "here's a revised version",
  'here is your essay', "here's your essay",
  'here is the essay you requested', "here's the essay you requested",
  'certainly! here', 'sure! here', 'sure, here', 'of course! here', 'absolutely! here',
]

function computeHeuristicScore(essay: string): { score: number; signals: string[] } {
  const sentences = essay.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const words = essay.split(/\s+/).filter(Boolean)
  const signals: string[] = []
  let score = 15 // neutral-ish baseline — most of the weight should come from actual signals

  // Sentence-length burstiness: human writing varies sentence length more,
  // but a fairly uniform CV is common in coached formal essays too, so this
  // only kicks in for genuinely extreme uniformity.
  if (sentences.length >= 4) {
    const lens = sentences.map((s) => s.split(/\s+/).filter(Boolean).length)
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0
    if (coefficientOfVariation < 0.18) {
      score += 12
      signals.push('Sentence lengths are unusually uniform (low variation) — a common trait of LLM output.')
    } else if (coefficientOfVariation > 0.5) {
      score -= 6
      signals.push('Sentence lengths vary a lot, which is typical of natural human writing.')
    }
  }

  // Stock AI-essay phrases — require at least 2 hits before penalizing,
  // since a single instance is well within normal essay-writing range.
  const lowerEssay = essay.toLowerCase()
  const hits = AI_STOCK_PHRASES.filter((p) => lowerEssay.includes(p))
  if (hits.length >= 2) {
    score += Math.min(18, hits.length * 6)
    signals.push(`Contains ${hits.length} generic AI-flavored phrases (e.g. "${hits[0]}").`)
  }

  // Chat-interface leakage — near-certain evidence regardless of which
  // AI product produced it, so this gets a much heavier weight than
  // ordinary style signals. A single hit is enough.
  const leakageHits = CHAT_LEAKAGE_PHRASES.filter((p) => lowerEssay.includes(p))
  if (leakageHits.length >= 1) {
    score += 55
    signals.push(`Contains direct AI-assistant phrasing (e.g. "${leakageHits[0]}") — reads like a copy-pasted chatbot reply rather than an original essay.`)
  }

  // Vocabulary diversity (type-token ratio) — lightly weighted, since low
  // diversity can also just mean a focused, on-topic essay.
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')))
  const ttr = words.length > 0 ? uniqueWords.size / words.length : 0
  if (words.length > 150 && ttr < 0.38) {
    score += 6
    signals.push('Vocabulary is fairly repetitive for the essay length.')
  }

  // Note: earlier versions of this checker penalized formal tone (no
  // contractions) and balanced paragraph lengths as AI tells. Both are
  // *correct, taught technique* for a UPCAT/ACET-style formal essay, so
  // penalizing them punished students for writing well. Removed.

  return { score: Math.max(0, Math.min(100, score)), signals }
}

// ============================================================
// 2. LLM judgment call via Groq
// ============================================================

async function llmAIJudgment(essay: string): Promise<{ likelihood: number; indicators: string[]; explanation: string } | null> {
  const groq = getGroqClient()
  if (!groq) return null

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an academic-integrity reviewer analyzing student essays for signs of AI-generated authorship, for a Philippine college-entrance essay coaching tool. The essay could have been produced by any AI assistant — ChatGPT, Claude, Gemini, Copilot, a Llama-based tool, or anything else — so do not assume one specific model's house style; draw on your general knowledge of how AI-written text tends to differ from student writing across assistants, not just one.

These students are actively coached to write formal, well-structured essays with clear transitions and no contractions — that is correct, TAUGHT technique, not evidence of AI authorship. Do NOT treat formal tone, proper structure, standard transition words (e.g. "furthermore", "moreover", "in conclusion"), or grammatical correctness as signals on their own — a strong human student is expected to produce exactly that.

The single strongest signal, if present, is leftover chat-assistant framing: phrases like "as an AI", "I don't have personal experiences", "here's your essay", or "let me know if you'd like revisions" — these mean the text was very likely copy-pasted directly from a chatbot reply, regardless of which AI produced it. Treat any such phrasing as strong evidence on its own.

Beyond that, weigh genuine indicators: near-total absence of any specific personal detail, memory, or concrete example across the WHOLE essay; generic claims that could apply to any topic interchangeably; oddly encyclopedic tangents unrelated to a personal prompt; or a mismatch between vocabulary sophistication and the reasoning/content quality. Be evidence-based, hedge honestly when uncertain, and do not fabricate signals that aren't present. Respond with ONLY valid JSON:
{"likelihood": <0-100 integer, your estimate that this was AI-generated>, "indicators": ["<short observed signal 1>", "<short observed signal 2>", "<short observed signal 3>"], "explanation": "<1-2 sentence honest, hedged assessment>"}`,
        },
        { role: 'user', content: `Essay to analyze:\n\n${essay}` },
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0]?.message?.content
    if (!text) return null
    const parsed = JSON.parse(text)
    return {
      likelihood: Math.max(0, Math.min(100, parseInt(parsed.likelihood) || 0)),
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators.slice(0, 4) : [],
      explanation: parsed.explanation || '',
    }
  } catch (err) {
    console.error('AI-detection LLM call failed:', err)
    return null
  }
}

function verdictFromLikelihood(likelihood: number): AIDetectionVerdict {
  if (likelihood >= 65) return 'Likely AI-Generated'
  if (likelihood >= 35) return 'Mixed / Possibly AI-Assisted'
  return 'Likely Human-Written'
}

async function detectAI(essay: string): Promise<AIDetectionResult> {
  const heuristic = computeHeuristicScore(essay)
  const llm = await llmAIJudgment(essay)

  // Blend: LLM judgment weighted higher when available, heuristic as a sanity check.
  const likelihood = llm ? Math.round(llm.likelihood * 0.65 + heuristic.score * 0.35) : heuristic.score

  const indicators = [...(llm?.indicators ?? []), ...heuristic.signals].slice(0, 5)

  return {
    likelihood,
    verdict: verdictFromLikelihood(likelihood),
    indicators,
    explanation:
      llm?.explanation ||
      'This is an automated estimate based on writing-style patterns. It is not proof of AI authorship — use it as one signal among others.',
  }
}

// ============================================================
// 3. Originality check — compares against the student's own history
// ============================================================

function shingles(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)
  const set = new Set<string>()
  for (let i = 0; i <= words.length - n; i++) {
    set.add(words.slice(i, i + n).join(' '))
  }
  return set
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const shingle of a) {
    if (b.has(shingle)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

async function checkOriginality(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  essay: string
): Promise<OriginalityResult> {
  const pastScores = await getUserScores(supabase, userId, { limit: 100 })
  const currentShingles = shingles(essay)

  let bestMatch: { similarity: number; essayId?: string } | null = null

  for (const past of pastScores) {
    if (!past.essay || past.essay.trim() === essay.trim()) {
      // Exact resubmission
      bestMatch = { similarity: 1, essayId: past.essayId }
      break
    }
    const sim = jaccardSimilarity(currentShingles, shingles(past.essay))
    if (!bestMatch || sim > bestMatch.similarity) {
      bestMatch = { similarity: sim, essayId: past.essayId }
    }
  }

  const similarityPercent = bestMatch ? Math.round(bestMatch.similarity * 100) : 0
  const score = 100 - similarityPercent
  const flagged = similarityPercent >= 40

  return {
    score,
    flagged,
    similarityPercent,
    matchedEssayId: bestMatch?.essayId,
    note: flagged
      ? similarityPercent >= 95
        ? 'This essay looks nearly identical to one of your previous submissions.'
        : 'This essay overlaps significantly with one of your previous submissions.'
      : pastScores.length === 0
      ? 'No previous essays on file yet — nothing to compare against.'
      : 'No significant overlap found with your previous submissions.',
  }
}

// ============================================================
// Route handler
// ============================================================

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in to run an integrity check.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = CheckSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: parseResult.error.errors[0]?.message || 'Invalid request data' },
      { status: 400 }
    )
  }
  const { essay } = parseResult.data

  try {
    const [aiDetection, originality] = await Promise.all([
      detectAI(essay),
      checkOriginality(supabase, user.id, essay),
    ])

    return NextResponse.json({ success: true, aiDetection, originality })
  } catch (err: any) {
    console.error('Integrity check error:', err?.message || err)
    return NextResponse.json({ success: false, error: 'Failed to run integrity check. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to run an integrity check.' }, { status: 405 })
}
