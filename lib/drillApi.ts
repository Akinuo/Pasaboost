// ============================================================
// Drill Mode Scoring — Client Helpers
// scoreDrillViaAPI() calls our own Next.js route (/api/score-drill).
// Mirrors the pattern in scoreApi.ts.
// ============================================================

import type { DrillScoreResponse, ScoreDimension } from '@/types'

export async function scoreDrillViaAPI(params: {
  dimension: ScoreDimension
  exerciseInstructions: string
  seedText?: string
  response: string
}): Promise<DrillScoreResponse> {
  try {
    const res = await fetch('/api/score-drill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include',
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

    let data: DrillScoreResponse
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
// Mock fallback — used when GROQ_API_KEY isn't configured yet,
// same role as generateMockScore() in scoreApi.ts.
// ============================================================

export function generateMockDrillScore(response: string): { score: number; feedback: string; tip: string } {
  const words = response.split(/\s+/).filter(Boolean).length
  const score = Math.max(8, Math.min(19, Math.round(10 + (words > 80 ? 4 : words > 40 ? 2 : 0) + Math.random() * 4)))
  return {
    score,
    feedback: `This is a demo score (AI scoring isn't configured yet) — your response was ${words} words. In a real evaluation, feedback here would focus specifically on this one dimension.`,
    tip: 'Once scoring is live, this tip will be tailored to your specific response.',
  }
}
