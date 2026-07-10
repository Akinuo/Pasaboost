'use client'

// ============================================================
// GrammarHighlightedTextarea
//
// A normal, fully-editable <textarea> with an inline highlight
// overlay for flagged grammar/style issues — click a highlighted
// phrase to see the issue and apply a one-click fix.
//
// How it works: the textarea sits on top with transparent text
// and a visible caret; a matching-styled div sits behind it and
// renders the same text with <mark> highlights. Since both share
// identical font/padding/line-wrapping, the highlights line up
// with what the student is actually typing. Only the <mark>
// elements are clickable (pointer-events: auto); everywhere else
// clicks pass straight through to the textarea for normal editing.
// ============================================================

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'
import type { GrammarIssue } from '@/types'

interface Props {
  value: string
  onChange: (value: string) => void
  issues: GrammarIssue[]
  onApplyFix: (issue: GrammarIssue) => void
  onDismissIssue: (issue: GrammarIssue) => void
  placeholder?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement>
  className?: string
}

const TYPE_LABEL: Record<GrammarIssue['type'], string> = {
  grammar: 'Grammar',
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  style: 'Style',
}

type Range = { start: number; end: number; issue: GrammarIssue }

export default function GrammarHighlightedTextarea({
  value, onChange, issues, onApplyFix, onDismissIssue, placeholder, textareaRef, className = '',
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const taRef = textareaRef ?? internalRef

  const [popover, setPopover] = useState<{ issue: GrammarIssue; top: number; left: number; width: number } | null>(null)

  // Build non-overlapping highlight ranges from the current text + active issues.
  // Recomputed on every keystroke, so if the user edits away a flagged excerpt,
  // its highlight (and the issue itself, further down) just disappears naturally.
  const ranges = useMemo(() => {
    const built: Range[] = []
    for (const issue of issues) {
      if (!issue.excerpt) continue
      const idx = value.indexOf(issue.excerpt)
      if (idx === -1) continue
      const start = idx
      const end = idx + issue.excerpt.length
      const overlaps = built.some((r) => start < r.end && end > r.start)
      if (!overlaps) built.push({ start, end, issue })
    }
    return built.sort((a, b) => a.start - b.start)
  }, [value, issues])

  // Prune issues whose excerpt no longer exists in the text (user already edited it).
  useEffect(() => {
    const stale = issues.filter((iss) => iss.excerpt && !value.includes(iss.excerpt))
    stale.forEach((iss) => onDismissIssue(iss))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setPopover(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkClick = (e: React.MouseEvent, issue: GrammarIssue) => {
    e.preventDefault()
    e.stopPropagation()
    const wrapperRect = wrapperRef.current?.getBoundingClientRect()
    const markRect = (e.target as HTMLElement).getBoundingClientRect()
    if (!wrapperRect) return
    const popoverWidth = Math.min(288, wrapperRect.width - 16) // never wider than the wrapper minus a small margin
    setPopover({
      issue,
      top: markRect.bottom - wrapperRect.top + 6,
      left: Math.min(Math.max(markRect.left - wrapperRect.left, 0), wrapperRect.width - popoverWidth),
      width: popoverWidth,
    })
  }

  const nodes: ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) nodes.push(<span key={`t-${i}`}>{value.slice(cursor, r.start)}</span>)
    nodes.push(
      <mark
        key={`m-${i}`}
        onClick={(e) => handleMarkClick(e, r.issue)}
        className="bg-primary/20 text-foreground rounded px-0.5 cursor-pointer pointer-events-auto border-b-2 border-primary/60 hover:bg-primary/30 transition-colors"
      >
        {value.slice(r.start, r.end)}
      </mark>
    )
    cursor = r.end
  })
  if (cursor < value.length) nodes.push(<span key="t-end">{value.slice(cursor)}</span>)

  const sharedBoxStyles = 'w-full min-h-[450px] p-4 font-sans text-base leading-relaxed whitespace-pre-wrap break-words'

  return (
    <div ref={wrapperRef} className="relative rounded-lg bg-background">
      {/* Overlay: renders the highlighted text, sits behind the textarea, but only <mark> intercepts clicks */}
      <div
        aria-hidden="true"
        className={`${sharedBoxStyles} absolute inset-0 pointer-events-none border border-transparent rounded-lg overflow-hidden text-foreground`}
      >
        {value ? nodes : null}
      </div>

      {/* Real textarea on top — transparent background/text so the overlay shows through, visible caret, fully editable as normal */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${sharedBoxStyles} ${className} relative bg-transparent text-transparent caret-foreground rounded-lg border border-input resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground`}
        style={{ overflow: 'hidden' }}
      />

      {popover && (
        <div
          className="absolute z-30 bg-card border border-border rounded-lg shadow-lg p-3.5"
          style={{ top: popover.top, left: Math.max(popover.left, 0), width: popover.width }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={13} className="text-primary flex-shrink-0" />
            <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">
              {TYPE_LABEL[popover.issue.type]}
            </span>
          </div>
          <p className="text-sm text-foreground mb-1">{popover.issue.issue}</p>
          {popover.issue.suggestion && (
            <p className="text-xs text-muted-foreground mb-3">{popover.issue.suggestion}</p>
          )}
          {popover.issue.replacement && (
            <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-foreground font-medium">&ldquo;{popover.issue.replacement}&rdquo;</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {popover.issue.replacement ? (
              <button
                onClick={() => { onApplyFix(popover.issue); setPopover(null) }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Check size={12} />
                Apply Fix
              </button>
            ) : (
              <span className="flex-1 text-xs text-muted-foreground italic px-1">No automatic fix available</span>
            )}
            <button
              onClick={() => { onDismissIssue(popover.issue); setPopover(null) }}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-input hover:bg-accent transition-colors"
              title="Dismiss this suggestion"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
