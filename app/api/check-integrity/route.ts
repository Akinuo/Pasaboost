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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ============================================================
// 1. AI-detection heuristics (pure JS, no API cost)
// ============================================================

const AI_STOCK_PHRASES = [
  'in conclusion', 'in today\'s society', 'it is important to note',
  'delve into', 'furthermore', 'moreover', 'in the fast-paced world',
  'plays a crucial role', 'as we navigate', 'in an era of',
  'it is worth noting', 'this essay will explore', 'in summary',
  'on the other hand', 'a testament to', 'underscores the importance',
  'in the realm of', 'ever-evolving', 'multifaceted',
]

function computeHeuristicScore(essay: string): { score: number; signals: string[] } {
  const sentences = essay.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const words = essay.split(/\s+/).filter(Boolean)
  const signals: string[] = []
  let score = 30 // baseline

  // Sentence-length burstiness: human writing varies sentence length more.
  if (sentences.length >= 4) {
    const lens = sentences.map((s) => s.split(/\s+/).filter(Boolean).length)
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0
    if (coefficientOfVariation < 0.25) {
      score += 20
      signals.push('Sentence lengths are unusually uniform (low variation) — a common trait of LLM output.')
    } else if (coefficientOfVariation > 0.55) {
      score -= 10
      signals.push('Sentence lengths vary a lot, which is typical of natural human writing.')
    }
  }

  // Stock AI-essay phrases
  const lowerEssay = essay.toLowerCase()
  const hits = AI_STOCK_PHRASES.filter((p) => lowerEssay.includes(p))
  if (hits.length >= 2) {
    score += Math.min(25, hits.length * 8)
    signals.push(`Contains ${hits.length} commonly AI-generated stock phrases (e.g. "${hits[0]}").`)
  }

  // Vocabulary diversity (type-token ratio) — AI text is often smoother/more repetitive at scale,
  // but very LOW diversity can also just mean short/simple writing, so weight this lightly.
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')))
  const ttr = words.length > 0 ? uniqueWords.size / words.length : 0
  if (words.length > 150 && ttr < 0.38) {
    score += 8
    signals.push('Vocabulary is fairly repetitive for the essay length.')
  }

  // Near-total absence of contractions/informal markers in a personal essay
  const hasContractions = /\b(don't|can't|it's|i'm|didn't|wasn't|there's|wouldn't|couldn't)\b/i.test(essay)
  if (!hasContractions && words.length > 150) {
    score += 5
    signals.push('No contractions used — slightly more formal/uniform than typical student writing.')
  } else if (hasContractions) {
    score -= 5
  }

  return { score: Math.max(0, Math.min(100, score)), signals }
}

// ============================================================
// 2. LLM judgment call via Groq
// ============================================================

async function llmAIJudgment(essay: string): Promise<{ likelihood: number; indicators: string[]; explanation: string } | null> {
  if (!process.env.GROQ_API_KEY) return null

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You analyze student essays for signs of AI-generated (ChatGPT/LLM) authorship, for a Philippine college-entrance essay coaching tool. Be balanced and evidence-based — false accusations harm students. Respond with ONLY valid JSON:
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
  const flagged = similarityPercent >= 55

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
