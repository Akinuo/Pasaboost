// ============================================================
// Essay Scoring — Client Helpers
// scoreEssayViaAPI() calls our OWN Next.js route (/api/score-essay),
// which holds the Groq key server-side. No separate backend needed.
// ============================================================

import type { EssayScore, ExamType, ScoreDimension, ScoreEssayResponse } from '@/types'
import { getScoreBand } from '@/lib/utils'

export async function scoreEssayViaAPI(params: {
  essay: string
  prompt?: string
  examType: ExamType
}): Promise<ScoreEssayResponse> {
  try {
    const res = await fetch('/api/score-essay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include', // send the Supabase auth cookie
    })

    const raw = await res.text()
    if (!raw) {
      return {
        success: false,
        error: res.ok
          ? 'The scoring service returned an empty response. Try again in a moment.'
          : `Scoring service error (HTTP ${res.status}).`,
      }
    }

    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      return { success: false, error: `Unexpected response from server (HTTP ${res.status}). Please try again.` }
    }

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` }
    }
    return data
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ============================================================
// Client-side mock scorer — used as an offline/demo fallback
// when GROQ_API_KEY isn't configured yet. Never used once the
// real backend route is live; scoreEssayViaAPI is always tried first.
// ============================================================

export function generateMockScore(
  essay: string,
  prompt: string | undefined,
  examType: ExamType
): Omit<EssayScore, 'id' | 'createdAt'> {
  const words = essay.split(/\s+/).filter(Boolean).length
  const sentences = essay.split(/[.!?]+/).filter((s) => s.trim()).length
  const paragraphs = essay.split(/\n\n+/).filter((p) => p.trim()).length

  const contentScore = Math.min(20, Math.max(8, Math.round(
    (words > 200 ? 14 : words > 100 ? 11 : 8) +
    (prompt && essay.toLowerCase().includes(prompt.split(' ')[0].toLowerCase()) ? 3 : 0) +
    Math.random() * 3
  )))
  const orgScore = Math.min(20, Math.max(8, Math.round((paragraphs >= 3 ? 13 : paragraphs === 2 ? 10 : 8) + Math.random() * 4)))
  const grammarScore = Math.min(20, Math.max(8, Math.round(15 + Math.random() * 5 - (essay.match(/\bi\b/g)?.length || 0) * 0.5)))
  const coherenceScore = Math.min(20, Math.max(8, Math.round((sentences > 5 ? 13 : 10) + Math.random() * 4)))
  const argumentScore = Math.min(20, Math.max(8, Math.round((essay.includes('because') || essay.includes('therefore') ? 14 : 11) + Math.random() * 4)))
  const totalScore = contentScore + orgScore + grammarScore + coherenceScore + argumentScore

  const rubricScores = [
    { dimension: 'Content' as ScoreDimension, score: contentScore, maxScore: 20 as const, feedback: getContentFeedback(contentScore), strengths: getStrengths('Content', contentScore), weaknesses: getWeaknesses('Content', contentScore) },
    { dimension: 'Organization' as ScoreDimension, score: orgScore, maxScore: 20 as const, feedback: getOrgFeedback(orgScore), strengths: getStrengths('Organization', orgScore), weaknesses: getWeaknesses('Organization', orgScore) },
    { dimension: 'Grammar' as ScoreDimension, score: grammarScore, maxScore: 20 as const, feedback: getGrammarFeedback(grammarScore), strengths: getStrengths('Grammar', grammarScore), weaknesses: getWeaknesses('Grammar', grammarScore) },
    { dimension: 'Coherence' as ScoreDimension, score: coherenceScore, maxScore: 20 as const, feedback: getCoherenceFeedback(coherenceScore), strengths: getStrengths('Coherence', coherenceScore), weaknesses: getWeaknesses('Coherence', coherenceScore) },
    { dimension: 'Argument' as ScoreDimension, score: argumentScore, maxScore: 20 as const, feedback: getArgumentFeedback(argumentScore), strengths: getStrengths('Argument', argumentScore), weaknesses: getWeaknesses('Argument', argumentScore) },
  ]

  const paragraphTexts = essay.split(/\n\n+/).filter((p) => p.trim().length > 50)
  const weakParagraph = paragraphTexts[Math.min(1, paragraphTexts.length - 1)] || paragraphTexts[0] || essay

  return {
    userId: '',
    essay,
    prompt,
    examType,
    examMode: false,
    totalScore,
    rubricScores,
    overallFeedback: generateOverallFeedback(totalScore, examType),
    strengths: generateOverallStrengths(rubricScores),
    weaknesses: generateOverallWeaknesses(rubricScores),
    suggestions: generateSuggestions(rubricScores),
    paragraphRewrites: [{
      original: weakParagraph,
      rewritten: rewriteParagraph(weakParagraph),
      explanation: 'This rewrite improves clarity, uses stronger vocabulary, and strengthens the logical flow of ideas.',
      improvements: [
        'Added transitional phrases for smoother flow',
        'Replaced vague terms with specific academic vocabulary',
        'Strengthened the topic sentence',
        'Added supporting evidence structure',
      ],
    }],
    estimatedBand: getScoreBand(totalScore),
    readabilityScore: Math.round(60 + Math.random() * 30),
    vocabularyDiversity: Math.round(45 + Math.random() * 40),
    modelVersion: 'demo-mock-v1',
    grammarIssues: generateMockGrammarIssues(essay),
  }
}

function generateMockGrammarIssues(essay: string): { type: 'grammar' | 'spelling' | 'punctuation' | 'style'; excerpt: string; issue: string; suggestion: string }[] {
  const sentences = essay.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8)
  const issues: { type: 'grammar' | 'spelling' | 'punctuation' | 'style'; excerpt: string; issue: string; suggestion: string }[] = []
  for (const s of sentences.slice(0, 3)) {
    if (/\bvery\b/i.test(s)) {
      issues.push({ type: 'style', excerpt: s.trim().slice(0, 60), issue: 'Overused intensifier "very"', suggestion: 'Use a stronger, more specific word instead.' })
    } else if (/\bi\b/.test(s)) {
      issues.push({ type: 'grammar', excerpt: s.trim().slice(0, 60), issue: 'Lowercase "i" should be capitalized', suggestion: 'Capitalize "I" when referring to yourself.' })
    }
  }
  return issues.slice(0, 3)
}

function getContentFeedback(score: number): string {
  if (score >= 17) return 'Excellent content development with rich, relevant ideas that directly address the prompt.'
  if (score >= 14) return 'Good content development with relevant ideas. Consider adding more specific examples and evidence.'
  if (score >= 11) return 'Content is adequate but needs more depth. Expand your ideas with concrete examples.'
  return 'Content needs significant development. Focus on directly addressing the prompt with relevant supporting details.'
}
function getOrgFeedback(score: number): string {
  if (score >= 17) return 'Outstanding organization with clear introduction, body paragraphs, and conclusion.'
  if (score >= 14) return 'Good organizational structure. Strengthen transitions between paragraphs for better flow.'
  if (score >= 11) return 'Basic organization is present but needs improvement. Ensure each paragraph has a clear topic sentence.'
  return 'Organization needs significant work. Structure your essay with a clear introduction, body, and conclusion.'
}
function getGrammarFeedback(score: number): string {
  if (score >= 17) return 'Excellent command of grammar with minimal errors. Varied sentence structures enhance readability.'
  if (score >= 14) return 'Good grammar overall with minor errors. Review subject-verb agreement and punctuation.'
  if (score >= 11) return 'Several grammatical errors present. Focus on consistent verb tenses and correct sentence structure.'
  return 'Significant grammatical errors impede understanding. Review basic grammar rules and sentence construction.'
}
function getCoherenceFeedback(score: number): string {
  if (score >= 17) return 'Excellent coherence with smooth flow of ideas. Each sentence logically leads to the next.'
  if (score >= 14) return 'Good overall coherence. Use more transitional words to improve idea progression.'
  if (score >= 11) return 'Some ideas are disjointed. Work on connecting sentences and paragraphs more explicitly.'
  return 'The essay lacks coherence. Ensure each paragraph focuses on one main idea with clear connections.'
}
function getArgumentFeedback(score: number): string {
  if (score >= 17) return 'Compelling argument with strong thesis, logical reasoning, and persuasive evidence.'
  if (score >= 14) return 'Good argumentative structure. Strengthen your thesis and provide more concrete evidence.'
  if (score >= 11) return 'Basic argument present but needs development. Clarify your position and support it more thoroughly.'
  return 'Argument needs significant strengthening. Develop a clear thesis and support it with logical reasoning.'
}

function getStrengths(dim: string, score: number): string[] {
  if (score >= 16) return [`Strong ${dim.toLowerCase()} throughout the essay`, `Demonstrates clear mastery of ${dim.toLowerCase()} techniques`]
  if (score >= 12) return [`Adequate ${dim.toLowerCase()} in some sections`]
  return ['Shows basic understanding of requirements']
}
function getWeaknesses(dim: string, score: number): string[] {
  if (score < 12) return [`${dim} needs substantial improvement`, `Key ${dim.toLowerCase()} elements are missing or underdeveloped`]
  if (score < 16) return [`${dim} could be more consistently applied`]
  return []
}

function generateOverallFeedback(score: number, examType: ExamType): string {
  const band = getScoreBand(score)
  return `Your essay scored ${score}/100 (${band}) on the ${examType} rubric. ${
    score >= 75
      ? 'You demonstrate strong writing skills with good command of the key essay elements.'
      : score >= 60
      ? 'Your essay shows developing competence. With targeted practice in the weaker areas, you can significantly improve your score.'
      : 'Your essay needs considerable development. Focus on the specific feedback for each dimension and practice regularly.'
  }`
}

type RubricScoreSimple = { dimension: ScoreDimension; score: number }

function generateOverallStrengths(rubricScores: RubricScoreSimple[]): string[] {
  return [...rubricScores].sort((a, b) => b.score - a.score).slice(0, 2)
    .map((s) => `Strong performance in ${s.dimension} (${s.score}/20)`)
}
function generateOverallWeaknesses(rubricScores: RubricScoreSimple[]): string[] {
  return rubricScores.filter((s) => s.score < 13).map((s) => `${s.dimension} needs improvement (${s.score}/20)`)
}
function generateSuggestions(rubricScores: RubricScoreSimple[]): string[] {
  const suggestions = [
    "Read sample high-scoring essays from your target school's previous admission batches.",
    'Practice writing timed essays — most exams give 30-45 minutes.',
    'Build your vocabulary by reading Philippine broadsheets (PDI, Manila Bulletin) daily.',
  ]
  const weakest = [...rubricScores].sort((a, b) => a.score - b.score)[0]
  if (weakest.score < 14) {
    const dimSuggestions: Record<string, string> = {
      Content: 'Strengthen content by researching current Philippine and global issues.',
      Organization: 'Practice the 5-paragraph essay format: intro, 3 body paragraphs, conclusion.',
      Grammar: 'Review grammar rules and use tools like Grammarly for self-checking.',
      Coherence: 'Study transitional phrases and practice writing with topic sentences.',
      Argument: 'Learn claim-evidence-reasoning (CER) structure for stronger arguments.',
    }
    suggestions.unshift(dimSuggestions[weakest.dimension] || '')
  }
  return suggestions.filter(Boolean).slice(0, 5)
}
function rewriteParagraph(paragraph: string): string {
  return paragraph
    .replace(/\bi\b/g, 'I')
    .replace(/because /g, 'because of this, ')
    .replace(/but /g, 'However, ')
    .replace(/also /g, 'Furthermore, ')
    .replace(/\bvery\b/g, 'particularly')
    .replace(/\bgood\b/g, 'effective')
    .replace(/\bthings\b/g, 'aspects')
    + ' This demonstrates a comprehensive understanding of the issue at hand.'
}
