'use client'

// ============================================================
// SharePostModal
// Used both standalone (Community page "Share an Essay" button,
// blank compose) and pre-filled (Score detail page "Share to
// Community" button, carrying over the essay + exam type + score).
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Eye, EyeOff, Loader2, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createCommunityPost } from '@/lib/queries'
import { countWords } from '@/lib/utils'
import type { ExamType, ScoreDimension } from '@/types'

const EXAM_OPTIONS: ExamType[] = ['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']
const REVIEW_DIMENSION_OPTIONS: ScoreDimension[] = ['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']
const MAX_REVIEW_DIMENSIONS = 3

interface SharePostModalProps {
  open: boolean
  onClose: () => void
  onShared: (postId: string) => void
  userId: string
  displayName: string
  defaults?: {
    title?: string
    essay?: string
    examType?: ExamType
    prompt?: string
    scoreId?: string
    totalScore?: number
  }
}

export default function SharePostModal({ open, onClose, onShared, userId, displayName, defaults }: SharePostModalProps) {
  const [title, setTitle] = useState(defaults?.title ?? '')
  const [essay, setEssay] = useState(defaults?.essay ?? '')
  const [examType, setExamType] = useState<ExamType>(defaults?.examType ?? 'General')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [reviewRequested, setReviewRequested] = useState(false)
  const [reviewDimensions, setReviewDimensions] = useState<ScoreDimension[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const toggleDimension = (d: ScoreDimension) => {
    setReviewDimensions((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d)
      if (prev.length >= MAX_REVIEW_DIMENSIONS) return prev
      return [...prev, d]
    })
  }

  const handleSubmit = async () => {
    setError(null)
    if (!title.trim()) return setError('Give your essay a title.')
    if (essay.trim().length < 50) return setError('Essay needs to be at least 50 characters — share something worth reading.')
    if (reviewRequested && reviewDimensions.length === 0) return setError('Pick at least one dimension you want reviewed.')

    setSubmitting(true)
    try {
      const supabase = createClient()
      const postId = await createCommunityPost(supabase, {
        userId,
        displayName,
        isAnonymous,
        title: title.trim(),
        essay: essay.trim(),
        examType,
        prompt: defaults?.prompt,
        scoreId: defaults?.scoreId,
        totalScore: defaults?.totalScore,
        reviewRequested,
        reviewDimensions: reviewRequested ? reviewDimensions : [],
      })
      onShared(postId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share essay. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card border border-border rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <h2 className="font-display font-semibold text-foreground">Share to Community</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My take on social media and mental health"
                maxLength={120}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Exam type</label>
              <div className="flex gap-1.5 flex-wrap">
                {EXAM_OPTIONS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setExamType(ex)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${examType === ex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Essay</label>
                <span className="text-xs text-muted-foreground">{countWords(essay)} words</span>
              </div>
              <textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                rows={10}
                placeholder="Paste or write the essay you want to share…"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-y leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                {isAnonymous ? <EyeOff size={15} /> : <Eye size={15} />}
                Post anonymously
              </span>
              <span className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isAnonymous ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${isAnonymous ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </span>
            </button>

            <div>
              <button
                type="button"
                onClick={() => setReviewRequested(!reviewRequested)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <ClipboardCheck size={15} />
                  Request a structured review
                </span>
                <span className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${reviewRequested ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${reviewRequested ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </span>
              </button>

              {reviewRequested && (
                <div className="mt-2.5 pl-1">
                  <p className="text-xs text-muted-foreground mb-2">
                    Pick up to {MAX_REVIEW_DIMENSIONS} dimensions — classmates can each pick one to give you targeted feedback on.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {REVIEW_DIMENSION_OPTIONS.map((d) => {
                      const selected = reviewDimensions.includes(d)
                      const disabled = !selected && reviewDimensions.length >= MAX_REVIEW_DIMENSIONS
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleDimension(d)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Sharing…' : 'Share Essay'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
