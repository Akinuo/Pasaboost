'use client'

import { useMemo } from 'react'
import { diffWords } from '@/lib/utils'

export default function RevisionDiff({ original, revised }: { original: string; revised: string }) {
  const tokens = useMemo(() => diffWords(original, revised), [original, revised])

  const addedCount = useMemo(
    () => tokens.filter((t) => t.type === 'added').reduce((sum, t) => sum + t.text.trim().split(/\s+/).filter(Boolean).length, 0),
    [tokens]
  )
  const removedCount = useMemo(
    () => tokens.filter((t) => t.type === 'removed').reduce((sum, t) => sum + t.text.trim().split(/\s+/).filter(Boolean).length, 0),
    [tokens]
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {addedCount} words added
        </span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {removedCount} words removed
        </span>
      </div>
      <div className="p-4 rounded-lg border border-border bg-background text-sm leading-relaxed whitespace-pre-wrap">
        {tokens.map((tok, idx) => {
          if (tok.type === 'same') return <span key={idx}>{tok.text}</span>
          if (tok.type === 'added') {
            return (
              <span key={idx} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-sm">
                {tok.text}
              </span>
            )
          }
          return (
            <span key={idx} className="bg-red-500/15 text-red-700 dark:text-red-400 line-through decoration-red-500/50 rounded-sm">
              {tok.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}
