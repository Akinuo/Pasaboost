// ============================================================
// Outline Assistant — Client Helper
// Calls /api/outline to get a brainstorming structure for a
// given essay prompt, before the student starts writing.
// ============================================================

import type { OutlineResponse, ExamType } from '@/types'

export async function generateOutlineViaAPI(params: { prompt: string; examType: ExamType }): Promise<OutlineResponse> {
  try {
    const res = await fetch('/api/outline', {
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
          ? 'The outline service returned an empty response. Try again in a moment.'
          : `Outline service error (HTTP ${res.status}). If this just changed, the server may need a restart to pick up the new route.`,
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
