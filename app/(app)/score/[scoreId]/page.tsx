'use client'

import { use, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, XCircle, Lightbulb, ArrowUpDown, Star, PenLine, Share2, Download, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { getScore } from '@/lib/queries'
import { getScoreColor, getScoreBgColor, getScoreLabel, getDimensionColor, getDimensionIcon, formatDateTime } from '@/lib/utils'
import { exportScoreToPDF } from '@/lib/pdfExport'
import type { EssayScore, RubricScore, GrammarIssue } from '@/types'

export default function ScoreResultPage({ params }: { params: Promise<{ scoreId: string }> }) {
  const { scoreId } = use(params)
  const [score, setScore] = useState<EssayScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'rewrites' | 'essay' | 'integrity'>('overview')

  useEffect(() => {
    const supabase = createClient()
    getScore(supabase, scoreId).then((s) => {
      setScore(s)
      setLoading(false)
    })
  }, [scoreId])

  if (loading) return <ScoreResultSkeleton />
  if (!score) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Score not found.</p>
        <Link href="/history" className="mt-4 inline-block text-primary hover:underline">Back to history</Link>
      </div>
    )
  }

  const radarData = score.rubricScores.map((r) => ({ dimension: r.dimension, score: r.score, fullMark: 20 }))
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'rewrites', label: 'Rewrites' },
    { id: 'essay', label: 'My Essay' },
    { id: 'integrity', label: 'Integrity' },
  ] as const

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/history" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to history
      </Link>

      <motion.div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 dark:from-slate-950 dark:to-blue-950 px-6 py-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white">{score.examType}</span>
                <span className="text-xs text-white/60">{formatDateTime(score.createdAt)}</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-white mb-1">Essay Score Report</h1>
              {score.prompt && <p className="text-white/70 text-sm max-w-lg line-clamp-2">{score.prompt}</p>}
            </div>
            <div className="text-right">
              <div className={`text-6xl font-display font-bold ${score.totalScore >= 75 ? 'text-green-400' : score.totalScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score.totalScore}
              </div>
              <div className="text-white/60 text-sm">out of 100</div>
              <div className="mt-1 text-sm font-medium text-white/80">{score.estimatedBand}</div>
              {!!score.aiPenaltyApplied && (
                <div className="mt-1.5 text-xs text-red-300">
                  {score.preAIPenaltyScore} − {score.aiPenaltyApplied} (AI-detection penalty)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-5">
            {score.rubricScores.map((r) => (
              <div key={r.dimension} className="text-center">
                <div className="text-xs text-white/60 mb-1.5">{r.dimension}</div>
                <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
                  <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: getDimensionColor(r.dimension) }} initial={{ width: 0 }} animate={{ width: `${(r.score / 20) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                </div>
                <div className="text-sm font-bold text-white">{r.score}/20</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex border-b border-border bg-card">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div>
        {activeTab === 'overview' && (
          <motion.div className="grid md:grid-cols-2 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-4">Score Radar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}/20`, 'Score']} />
                  <Radar dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-4">Dimension Breakdown</h3>
              <div className="space-y-3">
                {score.rubricScores.map((r) => <DimensionBar key={r.dimension} rubric={r} />)}
              </div>
            </div>

            <div className="md:col-span-2 bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3">Overall Feedback</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{score.overallFeedback}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {score.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <XCircle size={16} className="text-red-500" />
                Areas to Improve
              </h3>
              <ul className="space-y-2">
                {score.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <span className="text-foreground">{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" />
                Actionable Suggestions
              </h3>
              <ol className="space-y-2">
                {score.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-foreground">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}

        {activeTab === 'feedback' && (
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {score.rubricScores.map((r) => (
              <div key={r.dimension} className={`rounded-2xl border p-5 ${getScoreBgColor(r.score * 5)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getDimensionIcon(r.dimension)}</span>
                    <h3 className="font-display font-bold text-foreground">{r.dimension}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${getScoreColor(r.score * 5)}`}>{r.score}</div>
                    <div className="text-muted-foreground text-sm">/ 20</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getScoreColor(r.score * 5)} bg-white/50 dark:bg-black/20`}>{getScoreLabel(r.score * 5)}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-4 leading-relaxed">{r.feedback}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {r.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">Strengths</p>
                      <ul className="space-y-1">
                        {r.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                            <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 uppercase tracking-wide">Weaknesses</p>
                      <ul className="space-y-1">
                        {r.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                            <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'rewrites' && (
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <ArrowUpDown size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Compare your original paragraphs with AI-improved rewrites. Each rewrite explains exactly what was changed and why.
              </p>
            </div>

            {score.paragraphRewrites.map((pr, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-muted/50 border-b border-border">
                  <h3 className="font-display font-bold text-sm text-foreground">Paragraph {i + 1} — Rewrite</h3>
                </div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">{pr.original}</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={13} className="text-amber-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Rewrite</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg p-3">{pr.rewritten}</p>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-border bg-muted/20">
                  <p className="text-sm font-medium text-foreground mb-2">What changed:</p>
                  <p className="text-sm text-muted-foreground mb-3">{pr.explanation}</p>
                  {pr.improvements.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pr.improvements.map((imp, j) => (
                        <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{imp}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'essay' && (
          <motion.div className="bg-card border border-border rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {score.prompt && (
              <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Prompt</p>
                <p className="text-sm text-foreground">{score.prompt}</p>
              </div>
            )}
            {score.grammarIssues && score.grammarIssues.length > 0 && (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-900/60 border border-amber-400 dark:border-amber-700" />
                Highlighted text has a flagged grammar/style issue — hover to see the suggestion.
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {score.essay.split('\n\n').map((para, i) => (
                <p key={i} className="mb-4 text-foreground leading-relaxed">
                  <HighlightedParagraph text={para} issues={score.grammarIssues ?? []} />
                </p>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'integrity' && (
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {score.aiDetection ? (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  {score.aiDetection.likelihood >= 65 ? (
                    <ShieldAlert size={18} className="text-red-500" />
                  ) : score.aiDetection.likelihood >= 35 ? (
                    <ShieldQuestion size={18} className="text-amber-500" />
                  ) : (
                    <ShieldCheck size={18} className="text-emerald-500" />
                  )}
                  <h3 className="font-display font-bold text-foreground">AI-Generated Text Check</h3>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Likelihood essay was AI-generated</span>
                  <span className="text-lg font-bold text-foreground">{score.aiDetection.likelihood}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: score.aiDetection.likelihood >= 65 ? '#ef4444' : score.aiDetection.likelihood >= 35 ? '#f59e0b' : '#10b981' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score.aiDetection.likelihood}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{score.aiDetection.verdict}</p>
                <p className="text-sm text-muted-foreground mb-3">{score.aiDetection.explanation}</p>
                {!!score.aiPenaltyApplied && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {score.aiPenaltyApplied} points were deducted from your total score because the AI-detection likelihood was {score.aiDetection.likelihood}% (≥60%).
                    </p>
                  </div>
                )}
                {score.aiDetection.indicators.length > 0 && (
                  <ul className="space-y-1.5">
                    {score.aiDetection.indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />{ind}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground/70 italic">Probabilistic estimate based on writing-style patterns — not proof of AI authorship.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">No AI-detection data was recorded for this submission.</div>
            )}

            {score.originality ? (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-display font-bold text-foreground mb-3">Originality vs. Your Past Essays</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Originality score</span>
                  <span className="text-lg font-bold text-foreground">{score.originality.score}/100</span>
                </div>
                <p className={`text-sm ${score.originality.flagged ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>{score.originality.note}</p>
                <p className="mt-3 text-[11px] text-muted-foreground/70 italic">Checks only against your own previous PasaBoost submissions — not a full internet plagiarism scan.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted-foreground">No originality data was recorded for this submission.</div>
            )}

            {score.grammarIssues && score.grammarIssues.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-display font-bold text-foreground mb-3">Flagged Grammar &amp; Style Issues ({score.grammarIssues.length})</h3>
                <div className="space-y-3">
                  {score.grammarIssues.map((g, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">{g.type}</span>
                        <span className="text-xs text-muted-foreground italic truncate">&ldquo;{g.excerpt}&rdquo;</span>
                      </div>
                      <p className="text-sm text-foreground">{g.issue}</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">→ {g.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => exportScoreToPDF(score)} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg bg-background hover:bg-accent transition-colors">
            <Download size={14} />
            Export PDF
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!') }} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg bg-background hover:bg-accent transition-colors">
            <Share2 size={14} />
            Share
          </button>
        </div>
        <Link href="/editor" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
          <PenLine size={15} />
          Write Another Essay
        </Link>
      </div>
    </div>
  )
}

function HighlightedParagraph({ text, issues }: { text: string; issues: GrammarIssue[] }) {
  const relevant = issues.filter((iss) => iss.excerpt && text.includes(iss.excerpt))
  if (relevant.length === 0) return <>{text}</>

  // Build non-overlapping highlight ranges from excerpt matches.
  type Range = { start: number; end: number; issue: GrammarIssue }
  const ranges: Range[] = []
  for (const issue of relevant) {
    const idx = text.indexOf(issue.excerpt)
    if (idx === -1) continue
    const start = idx
    const end = idx + issue.excerpt.length
    const overlaps = ranges.some((r) => start < r.end && end > r.start)
    if (!overlaps) ranges.push({ start, end, issue })
  }
  ranges.sort((a, b) => a.start - b.start)

  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(<span key={`t-${i}`}>{text.slice(cursor, r.start)}</span>)
    parts.push(
      <mark
        key={`m-${i}`}
        title={`${r.issue.issue} → ${r.issue.suggestion}`}
        className="bg-amber-200/70 dark:bg-amber-900/50 text-inherit rounded px-0.5 cursor-help border-b border-amber-400 dark:border-amber-700"
      >
        {text.slice(r.start, r.end)}
      </mark>
    )
    cursor = r.end
  })
  if (cursor < text.length) parts.push(<span key="t-end">{text.slice(cursor)}</span>)

  return <>{parts}</>
}

function DimensionBar({ rubric }: { rubric: RubricScore }) {
  const pct = (rubric.score / 20) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-sm">
          <span>{getDimensionIcon(rubric.dimension)}</span>
          <span className="font-medium text-foreground">{rubric.dimension}</span>
        </div>
        <span className={`text-sm font-bold ${getScoreColor(rubric.score * 5)}`}>{rubric.score}/20</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: getDimensionColor(rubric.dimension) }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </div>
    </div>
  )
}

function ScoreResultSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-4">
      <div className="h-8 w-32 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-2xl" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-60 bg-muted rounded-2xl" />
        <div className="h-60 bg-muted rounded-2xl" />
      </div>
    </div>
  )
}