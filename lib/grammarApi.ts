// ============================================================
// Grammar Check — Client Helper
// Calls /api/check-grammar, a lightweight draft-time proofreading
// pass separate from full essay scoring — safe to call as often
// as the student likes while writing.
// ============================================================

import type { GrammarCheckResponse } from '@/types'

export async function checkGrammarViaAPI(essay: string): Promise<GrammarCheckResponse> {
  try {
    const res = await fetch('/api/check-grammar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essay }),
      credentials: 'include',
    })

    const raw = await res.text()
    if (!raw) {
      return {
        success: false,
        error: res.ok
          ? 'The grammar check returned an empty response. Try again in a moment.'
          : `Grammar check error (HTTP ${res.status}). If this just changed, the server may need a restart to pick up the new route.`,
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
