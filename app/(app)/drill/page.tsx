'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crosshair, RefreshCw, Loader2, CheckCircle2, History as HistoryIcon, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getUserScores, saveDrillAttempt, getDrillHistory } from '@/lib/queries'
import { getDrillExercise } from '@/lib/prompts'
import { scoreDrillViaAPI, generateMockDrillScore } from '@/lib/drillApi'
import { countWords, getWeakestDimension, DIMENSION_DESCRIPTIONS } from '@/lib/utils'
import type { EssayScore, DrillAttempt, DrillExercise, ScoreDimension } from '@/types'

const DIMENSIONS: ScoreDimension[] = ['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']

export default function DrillModePage() {
  const { user } = useAuth()
  const [recentScores, setRecentScores] = useState<EssayScore[]>([])
  const [history, setHistory] = useState<DrillAttempt[]>([])
  const [loading, setLoading] = useState(true)

  const weakest = useMemo(() => getWeakestDimension(recentScores), [recentScores])

  const [dimension, setDimension] = useState<ScoreDimension>('Content')
  const [exercise, setExercise] = useState<DrillExercise>(() => getDrillExercise('Content'))
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; feedback: string; tip?: string } | null>(null)

  const wordCount = countWords(response)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    Promise.all([
      getUserScores(supabase, user.id, { limit: 20 }),
      getDrillHistory(supabase, user.id, { limit: 10 }),
    ]).then(([scores, drills]) => {
      setRecentScores(scores)
      setHistory(drills)
      setLoading(false)

      const weak = getWeakestDimension(scores)
      if (weak) {
        setDimension(weak.dimension)
        setExercise(getDrillExercise(weak.dimension))
      }
    })
  }, [user])

  const handleDimensionChange = (d: ScoreDimension) => {
    setDimension(d)
    setExercise(getDrillExercise(d))
    setResponse('')
    setResult(null)
    setError(null)
  }

  const handleNewExercise = () => {
    setExercise(getDrillExercise(dimension))
    setResponse('')
    setResult(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!user || wordCount < 15) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await scoreDrillViaAPI({
        dimension,
        exerciseInstructions: exercise.instructions,
        seedText: exercise.seedText,
        response,
      })
      const scored = res.success && res.score
        ? { score: res.score, feedback: res.feedback || '', tip: res.tip }
        : generateMockDrillScore(response)

      setResult(scored)

      const supabase = createClient()
      await saveDrillAttempt(supabase, {
        userId: user.id,
        dimension,
        exercisePrompt: exercise.instructions,
        response,
        wordCount,
        score: scored.score,
        feedback: scored.feedback,
        tip: scored.tip,
      })
      const updated = await getDrillHistory(supabase, user.id, { limit: 10 })
      setHistory(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to score drill. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const dimensionAverage = (d: ScoreDimension) => {
    const attempts = history.filter((h) => h.dimension === d)
    if (!attempts.length) return null
    return Math.round((attempts.reduce((s, a) => s + a.score, 0) / attempts.length) * 10) / 10
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-2">
        <Crosshair size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">Drill Mode</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Short, focused exercises — a few minutes each — that isolate one rubric dimension at a time instead of a full essay.
        {weakest && !loading && (
          <> Based on your recent essays, <strong className="text-foreground">{weakest.dimension}</strong> is your lowest-scoring dimension — {DIMENSION_DESCRIPTIONS[weakest.dimension]}.</>
        )}
      </p>

      {/* Dimension picker */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DIMENSIONS.map((d) => {
          const avg = dimensionAverage(d)
          const isWeakest = weakest?.dimension === d
          const isActive = dimension === d
          return (
            <button
              key={d}
              onClick={() => handleDimensionChange(d)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:border-foreground/30'
              }`}
            >
              {d}
              {isWeakest && <Sparkles size={12} className={isActive ? 'text-primary-foreground' : 'text-primary'} />}
              {avg !== null && (
                <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {avg}/20
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Exercise card */}
      <motion.div
        key={`${dimension}-${exercise.instructions}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-lg border border-border bg-card mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{dimension} Drill</span>
          <button
            onClick={handleNewExercise}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={12} />
            New exercise
          </button>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-3">{exercise.instructions}</p>
        {exercise.seedText && (
          <div className="p-3 rounded-md bg-background border border-border text-sm text-muted-foreground leading-relaxed mb-1">
            {exercise.seedText}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Aim for {exercise.minWords}-{exercise.maxWords} words.</p>
      </motion.div>

      {/* Response area */}
      {!result ? (
        <div className="mb-6">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response here..."
            rows={8}
            className="w-full p-4 rounded-lg border border-border bg-background text-sm text-foreground leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{wordCount} words</span>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || wordCount < 15}
            className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {submitting ? 'Scoring...' : 'Submit for Feedback'}
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-lg border border-border bg-card mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Result</span>
              <span className="text-2xl font-bold text-primary">{result.score}<span className="text-sm text-muted-foreground">/20</span></span>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">{result.feedback}</p>
            {result.tip && (
              <p className="text-xs text-muted-foreground bg-background border border-border rounded-md p-3">
                <strong className="text-foreground">Tip: </strong>{result.tip}
              </p>
            )}
            <button
              onClick={handleNewExercise}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <RefreshCw size={15} />
              Try Another Drill
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon size={15} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Attempts</span>
          </div>
          <div className="space-y-2">
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground shrink-0">{h.dimension}</span>
                  <span className="text-muted-foreground truncate">{h.createdAt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                </div>
                <span className="font-semibold text-foreground shrink-0">{h.score}/20</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
