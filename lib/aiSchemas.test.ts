import { describe, it, expect } from 'vitest'
import {
  parseAiJson,
  parseLenientArray,
  AiRubricScoreSchema,
  AiGrammarIssueSchema,
  AiEssayScoreResponseSchema,
} from './aiSchemas'

describe('parseAiJson', () => {
  it('parses clean JSON directly', () => {
    expect(parseAiJson('{"a": 1}')).toEqual({ a: 1 })
  })

  it('extracts a JSON object wrapped in prose or markdown fences', () => {
    const wrapped = 'Sure, here you go:\n```json\n{"a": 1}\n```\nHope that helps!'
    expect(parseAiJson(wrapped)).toEqual({ a: 1 })
  })

  it('throws when there is no valid JSON object anywhere in the text', () => {
    expect(() => parseAiJson('not json at all')).toThrow()
  })
})

describe('parseLenientArray', () => {
  it('drops malformed items instead of failing the whole array', () => {
    const input = [
      { type: 'grammar', excerpt: 'a real excerpt', issue: 'x', suggestion: 'y' },
      { type: 'grammar', excerpt: '' }, // invalid: excerpt must be non-empty
      { excerpt: 'another excerpt' }, // valid: other fields have catch() defaults
      'not even an object',
    ]
    const result = parseLenientArray(AiGrammarIssueSchema, input)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.excerpt.length > 0)).toBe(true)
  })

  it('returns an empty array when given a non-array', () => {
    expect(parseLenientArray(AiGrammarIssueSchema, undefined)).toEqual([])
    expect(parseLenientArray(AiGrammarIssueSchema, { not: 'an array' })).toEqual([])
  })
})

describe('AiRubricScoreSchema', () => {
  it('clamps an out-of-range score into [1, 20]', () => {
    expect(AiRubricScoreSchema.parse({ dimension: 'Content', score: 45 }).score).toBe(20)
    expect(AiRubricScoreSchema.parse({ dimension: 'Content', score: -5 }).score).toBe(1)
  })

  it('truncates decimal scores rather than rounding up', () => {
    expect(AiRubricScoreSchema.parse({ dimension: 'Content', score: 15.9 }).score).toBe(15)
  })

  it('falls back to a default score when the AI omits or mistypes it', () => {
    expect(AiRubricScoreSchema.parse({ dimension: 'Content' }).score).toBe(8)
    expect(AiRubricScoreSchema.parse({ dimension: 'Content', score: 'not a number' }).score).toBe(8)
  })

  it('falls back to Content when dimension is missing or unrecognized — the real bug this schema fixes', () => {
    expect(AiRubricScoreSchema.parse({ score: 10 }).dimension).toBe('Content')
    expect(AiRubricScoreSchema.parse({ dimension: 'grammar', score: 10 }).dimension).toBe('Content') // wrong casing
  })

  it('passes through a well-formed dimension unchanged', () => {
    expect(AiRubricScoreSchema.parse({ dimension: 'Grammar', score: 10 }).dimension).toBe('Grammar')
  })
})

describe('AiEssayScoreResponseSchema', () => {
  it('never throws for a well-formed Groq-style response', () => {
    const valid = {
      rubricScores: [{ dimension: 'Content', score: 15, feedback: 'Good', strengths: [], weaknesses: [] }],
      overallFeedback: 'Solid essay.',
      strengths: ['Clear thesis'],
      weaknesses: ['Weak transitions'],
      suggestions: ['Add more evidence'],
      paragraphRewrites: [],
      grammarIssues: [],
    }
    expect(() => AiEssayScoreResponseSchema.parse(valid)).not.toThrow()
  })

  it('defaults top-level cosmetic fields instead of throwing when they are missing', () => {
    const parsed = AiEssayScoreResponseSchema.parse({})
    expect(parsed.overallFeedback).toBe('')
    expect(parsed.strengths).toEqual([])
  })

  it('throws when the AI response is not even an object', () => {
    expect(() => AiEssayScoreResponseSchema.parse('just a string')).toThrow()
    expect(() => AiEssayScoreResponseSchema.parse(null)).toThrow()
  })
})
