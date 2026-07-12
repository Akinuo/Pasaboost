'use client'

// ============================================================
// StructuredReview
// The "request a review" flow: more directed than the general
// comment feed. If the post's author asked for review on specific
// rubric dimensions, other students can pick one open dimension
// and leave one structured review for it (rating + what worked +
// a suggestion) instead of a free-form comment.
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, Star, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addPostReview } from '@/lib/queries'
import { getRelativeTime } from '@/lib/utils'
import type { CommunityPostReview, ScoreDimension } from '@/types'

interface StructuredReviewProps {
  postId: string
  isOwnPost: boolean
  reviewDimensions: ScoreDimension[]
  reviews: CommunityPostReview[]
  currentUserId: string
  displayName: string
  onReviewSubmitted: () => void
}

export default function StructuredReview({
  postId, isOwnPost, reviewDimensions, reviews, currentUserId, displayName, onReviewSubmitted,
}: StructuredReviewProps) {
  const [activeDimension, setActiveDimension] = useState<ScoreDimension | null>(null)
  const [rating, setRating] = useState(0)
  const [whatWorked, setWhatWorked] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reviewedByMeDimensions = new Set(reviews.filter((r) => r.isOwn).map((r) => r.dimension))
  const openDimensions = reviewDimensions.filter((d) => !reviewedByMeDimensions.has(d))

  const handleSubmit = async () => {
    if (!activeDimension) return
    setError(null)
    if (rating === 0) return setError('Give a rating.')
    if (whatWorked.trim().length < 3) return setError('Say a bit about what worked.')
    if (suggestion.trim().length < 3) return setError('Give one concrete suggestion.')

    setSubmitting(true)
    try {
      const supabase = createClient()
      await addPostReview(supabase, {
        postId,
        reviewerId: currentUserId,
        reviewerDisplayName: displayName,
        dimension: activeDimension,
        rating,
        whatWorked: whatWorked.trim(),
        suggestion: suggestion.trim(),
      })
      setActiveDimension(null)
      setRating(0)
      setWhatWorked('')
      setSuggestion('')
      onReviewSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6 mb-6">
      <h2 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
        <ClipboardCheck size={18} className="text-primary" />
        Structured Peer Review
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {isOwnPost
          ? 'Targeted feedback from classmates, one dimension at a time.'
          : 'Pick an open dimension and leave one focused review for it.'}
      </p>

      {!isOwnPost && (
        <>
          {openDimensions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {openDimensions.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDimension(activeDimension === d ? null : d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeDimension === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  Review {d}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
              <CheckCircle2 size={13} className="score-good" />
              {reviewDimensions.length === 0 ? "This author isn't requesting review right now." : "You've reviewed every dimension this author asked for."}
            </p>
          )}

          <AnimatePresence>
            {activeDimension && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating for {activeDimension}</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
                          <Star size={20} className={n <= rating ? 'text-primary fill-primary' : 'text-muted-foreground/40'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What worked</label>
                    <textarea
                      value={whatWorked}
                      onChange={(e) => setWhatWorked(e.target.value)}
                      rows={2}
                      maxLength={600}
                      placeholder={`One specific thing that worked well for ${activeDimension}…`}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">One suggestion</label>
                    <textarea
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                      rows={2}
                      maxLength={600}
                      placeholder="One concrete way to improve this dimension…"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-y"
                    />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveDimension(null)}
                      className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-background hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {submitting && <Loader2 size={12} className="animate-spin" />}
                      Submit Review
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No structured reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviewDimensions
            .filter((d) => reviews.some((r) => r.dimension === d))
            .map((d) => (
              <div key={d}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">{d}</p>
                <div className="space-y-2.5">
                  {reviews.filter((r) => r.dimension === d).map((r) => (
                    <div key={r.id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{r.reviewerDisplayName}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={11} className={n <= r.rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'} />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{getRelativeTime(r.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed"><span className="score-good font-medium">Worked: </span>{r.whatWorked}</p>
                      <p className="text-xs text-foreground leading-relaxed mt-1"><span className="text-primary font-medium">Try: </span>{r.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
