'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getScoreHistory, getUserScores } from '@/lib/queries'
import { getDimensionColor, getScoreLabel } from '@/lib/utils'
import type { ScoreDataPoint, DimensionProgress, ScoreDimension } from '@/types'

const DIMENSIONS: ScoreDimension[] = ['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [scoreHistory, setScoreHistory] = useState<ScoreDataPoint[]>([])
  const [dimensionProgress, setDimensionProgress] = useState<DimensionProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'scores' | 'dimensions' | 'writing'>('scores')

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    Promise.all([
      getScoreHistory(supabase, user.id),
      getUserScores(supabase, user.id, { limit: 50 }),
    ]).then(([history, scores]) => {
      setScoreHistory(history)

      if (scores.length >= 2) {
        const first = scores[scores.length - 1]
        const last = scores[0]
        const progress: DimensionProgress[] = DIMENSIONS.map((dim) => {
          const firstScore = first.rubricScores.find((r) => r.dimension === dim)?.score ?? 0
          const lastScore = last.rubricScores.find((r) => r.dimension === dim)?.score ?? 0
          const improvement = lastScore - firstScore
          return { dimension: dim, firstScore, latestScore: lastScore, improvement, trend: improvement > 0 ? 'up' : improvement < 0 ? 'down' : 'stable' }
        })
        setDimensionProgress(progress)
      }

      setLoading(false)
    })
  }, [user])

  const avgScore = scoreHistory.length ? Math.round(scoreHistory.reduce((s, e) => s + e.totalScore, 0) / scoreHistory.length) : 0
  const improvement = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 1].totalScore - scoreHistory[0].totalScore : 0

  const tabs = [
    { id: 'scores', label: 'Score Progression' },
    { id: 'dimensions', label: 'By Dimension' },
    { id: 'writing', label: 'Writing Stats' },
  ] as const

  if (loading) return <AnalyticsSkeleton />

  if (scoreHistory.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart3 size={48} className="mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">No data yet</h2>
        <p className="text-muted-foreground">Submit at least one essay to start seeing your analytics.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track your writing progress over time</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Essays', value: scoreHistory.length.toString(), sub: 'submissions' },
          { label: 'Average Score', value: `${avgScore}/100`, sub: getScoreLabel(avgScore) },
          { label: 'Overall Progress', value: `${improvement > 0 ? '+' : ''}${improvement}`, sub: improvement > 0 ? 'points gained' : improvement < 0 ? 'points lost' : 'stable', color: improvement > 0 ? 'score-good' : improvement < 0 ? 'score-poor' : 'text-muted-foreground' },
          { label: 'Best Score', value: `${Math.max(...scoreHistory.map((s) => s.totalScore))}/100`, sub: 'personal best' },
        ].map((stat, i) => (
          <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="text-2xl font-display font-semibold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className={`text-xs mt-0.5 font-medium ${stat.color || 'text-muted-foreground'}`}>{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scores' && (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display font-semibold text-foreground mb-5">Total Score Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={scoreHistory}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [`${val}/100`, 'Total Score']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="totalScore" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Excellent', threshold: 90, color: 'bg-[hsl(var(--score-excellent))]' },
              { label: 'Proficient', threshold: 75, color: 'bg-[hsl(var(--score-good))]' },
              { label: 'Your Average', threshold: avgScore, color: 'bg-primary' },
            ].map((b) => (
              <div key={b.label} className="p-4 rounded-lg border border-border bg-card text-center">
                <div className={`w-3 h-3 rounded-full ${b.color} mx-auto mb-2`} />
                <div className="text-lg font-bold text-foreground">{b.threshold}</div>
                <div className="text-xs text-muted-foreground">{b.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'dimensions' && (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display font-semibold text-foreground mb-5">All Dimensions Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {DIMENSIONS.map((dim) => (
                  <Line key={dim} type="monotone" dataKey={dim.toLowerCase()} stroke={getDimensionColor(dim)} strokeWidth={2} dot={false} name={dim} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {dimensionProgress.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dimensionProgress.map((dp) => (
                <div key={dp.dimension} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{dp.dimension.charAt(0)}</span>
                      <span className="font-medium text-foreground text-sm">{dp.dimension}</span>
                    </div>
                    {dp.trend === 'up' ? <TrendingUp size={16} className="score-good" /> : dp.trend === 'down' ? <TrendingDown size={16} className="score-poor" /> : <Minus size={16} className="text-muted-foreground" />}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{dp.firstScore} → <strong className="text-foreground">{dp.latestScore}</strong>/20</span>
                    <span className={`font-semibold ${dp.improvement > 0 ? 'score-good' : dp.improvement < 0 ? 'score-poor' : 'text-muted-foreground'}`}>{dp.improvement > 0 ? '+' : ''}{dp.improvement}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'writing' && (
        <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display font-semibold text-foreground mb-5">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { range: '<45', count: scoreHistory.filter((s) => s.totalScore < 45).length },
                { range: '45–59', count: scoreHistory.filter((s) => s.totalScore >= 45 && s.totalScore < 60).length },
                { range: '60–74', count: scoreHistory.filter((s) => s.totalScore >= 60 && s.totalScore < 75).length },
                { range: '75–89', count: scoreHistory.filter((s) => s.totalScore >= 75 && s.totalScore < 90).length },
                { range: '90–100', count: scoreHistory.filter((s) => s.totalScore >= 90).length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Essays" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Essays by Exam Type</h3>
            <div className="space-y-3">
              {['UPCAT', 'ACET', 'DCAT', 'USTET', 'General'].map((exam) => {
                const count = scoreHistory.filter((s) => s.examType === exam).length
                const pct = scoreHistory.length ? (count / scoreHistory.length) * 100 : 0
                return (
                  <div key={exam}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{exam}</span>
                      <span className="text-muted-foreground">{count} essays</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary/60 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
      </div>
      <div className="h-72 bg-muted rounded-lg" />
    </div>
  )
}
