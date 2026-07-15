// ============================================================
// Zod schemas for the OTHER untrusted input each AI route handles:
// not the client's request body (already validated with Zod at the
// top of every route), but the LLM's JSON reply. A model can omit a
// field, use the wrong casing, or return the wrong shape entirely —
// previously that was patched over field-by-field with `any`-typed
// .map()/.filter() callbacks and inline `typeof` checks repeated
// across five route files. These schemas centralize that leniency
// (via Zod's `.catch()`) so parsing is consistent and fully typed,
// while keeping the exact same "never let one malformed field sink
// the whole response" philosophy the original code had.
//
// Field-level defaulting (`.catch(...)`) is used for cosmetic fields
// where a fallback is harmless (empty feedback text, a default
// dimension label). It is deliberately NOT used for fields whose
// entire item is meaningless without it (e.g. a grammar issue's
// `excerpt`) — those items are dropped instead, via parseLenientArray,
// matching the original filter() behavior rather than papering over it.
// ============================================================

import { z } from 'zod'

/**
 * Parses AI JSON text, tolerating a model that wraps the JSON in
 * prose or markdown fences by extracting the outermost {...} block
 * as a fallback. Throws only if neither attempt yields valid JSON.
 */
export function parseAiJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid JSON response from AI')
    return JSON.parse(match[0])
  }
}

/**
 * Parses `value` as an array of T, silently dropping any element that
 * fails `schema` instead of failing the whole array. Mirrors the AI's
 * output being "best effort" — a few malformed items shouldn't sink
 * an otherwise-usable response.
 */
export function parseLenientArray<S extends z.ZodTypeAny>(schema: S, value: unknown): Array<z.infer<S>> {
  if (!Array.isArray(value)) return []
  const out: Array<z.infer<S>> = []
  for (const item of value) {
    const result = schema.safeParse(item)
    if (result.success) out.push(result.data)
  }
  return out
}

// Clamps a coerced score into [1, 20] and truncates decimals, matching
// the original `Math.max(1, Math.min(20, parseInt(r.score) || fallback))`.
const clampScore = (n: number) => Math.max(1, Math.min(20, Math.trunc(n)))

export const AiDimensionSchema = z
  .enum(['Content', 'Organization', 'Grammar', 'Coherence', 'Argument'])
  .catch('Content')

// ---- shared by /api/score-essay and /api/check-grammar ----
export const AiGrammarIssueSchema = z.object({
  type: z.enum(['grammar', 'spelling', 'punctuation', 'style']).catch('grammar'),
  // excerpt is load-bearing (the frontend locates/highlights it in the
  // essay), so an item without a real one is dropped, not defaulted.
  excerpt: z.string().min(1),
  issue: z.string().catch(''),
  suggestion: z.string().catch(''),
  replacement: z.string().min(1).optional().catch(undefined),
})
export type AiGrammarIssue = z.infer<typeof AiGrammarIssueSchema>

// ---- /api/score-essay ----
export const AiRubricScoreSchema = z.object({
  dimension: AiDimensionSchema,
  score: z.coerce.number().catch(8).transform(clampScore),
  feedback: z.string().catch(''),
  strengths: z.array(z.string()).catch([]),
  weaknesses: z.array(z.string()).catch([]),
})

export const AiParagraphRewriteSchema = z.object({
  original: z.string().catch(''),
  rewritten: z.string().catch(''),
  explanation: z.string().catch(''),
  improvements: z.array(z.string()).catch([]),
})

export const AiEssayScoreResponseSchema = z.object({
  rubricScores: z.unknown(), // validated item-by-item with parseLenientArray in the route
  overallFeedback: z.string().catch(''),
  strengths: z.array(z.string()).catch([]),
  weaknesses: z.array(z.string()).catch([]),
  suggestions: z.array(z.string()).catch([]),
  paragraphRewrites: z.unknown(),
  grammarIssues: z.unknown(),
})

// ---- /api/check-grammar ----
export const AiGrammarCheckResponseSchema = z.object({
  issues: z.unknown(),
})

// ---- /api/score-drill ----
export const AiDrillScoreResponseSchema = z.object({
  score: z.coerce.number().catch(10).transform(clampScore),
  feedback: z.string().catch(''),
  tip: z.string().min(1).optional().catch(undefined),
})

// ---- /api/outline ----
export const AiOutlineSectionSchema = z.object({
  title: z.string().catch('Section'),
  points: z.array(z.string()).catch([]),
})

export const AiOutlineResponseSchema = z.object({
  thesisSuggestion: z.string().catch(''),
  sections: z.unknown(),
  transitionTips: z.array(z.string()).catch([]),
})

// ---- /api/generate-daily-prompts ----
// Category/examType/difficulty membership checks stay in the route
// (they're domain lookups against PROMPT_CATEGORIES/EXAM_TYPES/
// DIFFICULTIES, not generic shape validation), so those fields are
// typed loosely here and validated there, same as before.
export const AiGeneratedPromptSchema = z.object({
  text: z.string().min(1),
  category: z.string().catch(''),
  examType: z.array(z.string()).catch([]),
  difficulty: z.string().catch(''),
  keywords: z.array(z.string()).catch([]),
  tip: z.string().min(1).optional().catch(undefined),
})

export const AiDailyPromptsResponseSchema = z.object({
  prompts: z.unknown(),
})
