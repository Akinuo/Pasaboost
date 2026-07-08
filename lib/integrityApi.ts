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
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` }
    }
    return data
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
