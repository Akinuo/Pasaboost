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
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` }
    }
    return data
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
