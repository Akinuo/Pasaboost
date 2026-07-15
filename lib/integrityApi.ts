// ============================================================
// Integrity Check — Client Helper
// Calls /api/check-integrity, which runs AI-generated-text
// detection and a self-originality check server-side.
// ============================================================

import type { IntegrityCheckResponse } from '@/types'

export async function checkIntegrityViaAPI(essay: string): Promise<IntegrityCheckResponse> {
  try {
    const res = await fetch('/api/check-integrity', {
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
          ? 'The integrity check returned an empty response. Try again in a moment.'
          : `Integrity check error (HTTP ${res.status}). If this just changed, the server may need a restart to pick up the new route.`,
      }
    }

    let data: IntegrityCheckResponse
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
