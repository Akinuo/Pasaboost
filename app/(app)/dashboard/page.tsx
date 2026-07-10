'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PenLine, TrendingUp, Star, ArrowRight, BarChart3, Clock, Target, BookOpen, Lightbulb, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getUserScores, getDailyGeneratedPrompts } from '@/lib/queries'
import { getDailyPrompt } from '@/lib/prompts'
import { getScoreColor, getScoreLabel, formatDateTime, EXAM_COLORS } from '@/lib/utils'
import type { EssayScore, WritingPrompt } from '@/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentScores, setRecentScores] = useState<EssayScore[]>([])
  const [loading, setLoading] = useState(true)
  const [aiPrompt, setAiPrompt] = useState<WritingPrompt | null>(null)

  // Same "today's prompt" source as the Prompts page — prefer the
  // freshly AI-generated one, fall back to the static deterministic
  // pick if the daily batch hasn't been generated yet.
  const dailyPrompt = aiPrompt ?? getDailyPrompt()

  const firstName = (user?.user_metadata?.display_name as string | undefined)?.split(' ')[0] || 'Student'

  useEffect(() => {
    const supabase = createClient()
    getDailyGeneratedPrompts(supabase, 1).then((prompts) => {
      if (prompts[0]) setAiPrompt(prompts[0])
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    getUserScores(supabase, user.id, { limit: 5 }).then((scores) => {
      setRecentScores(scores)
      setLoading(false)
    })

    // Realtime: refresh the list whenever a new score is inserted
    const channel = supabase
      .channel('dashboard-scores')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scores', filter: `user_id=eq.${user.id}` },
        () => getUserScores(supabase, user.id, { limit: 5 }).then(setRecentScores)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const avgScore = recentScores.length ? Math.round(recentScores.reduce((s, e) => s + e.totalScore, 0) / recentScores.length) : 0
  const bestScore = recentScores.length ? Math.max(...recentScores.map((s) => s.totalScore)) : 0
  const lastScore = recentScores[0]?.totalScore ?? null
  const prevScore = recentScores[1]?.totalScore ?? null
  const trend = lastScore !== null && prevScore !== null ? lastScore - prevScore : null

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Good {getGreeting()}, {firstName}
        </h1>
        <p className="page-subtitle">
          {loading ? 'Loading your dashboard…' : recentScores.length === 0
            ? "Let's write your first essay and see where you stand."
            : `You have ${recentScores.length} scored essay${recentScores.length > 1 ? 's' : ''}. Keep going!`}
        </p>
      </div>

      <motion.div className="mb-8 p-6 rounded-lg bg-foreground text-background" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={16} className="text-primary" />
              <span className="text-xs font-medium text-background/60 uppercase tracking-wider">Today&apos;s Prompt</span>
              {aiPrompt && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/15 text-background">
                  <Sparkles size={9} />
                  AI Generated
                </span>
              )}
            </div>
            <p className="font-medium text-background max-w-xl leading-snug">{dailyPrompt.text}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-background/15 text-background rounded-full">{dailyPrompt.category}</span>
              <span className="text-xs px-2 py-0.5 bg-background/15 text-background rounded-full">{dailyPrompt.difficulty}</span>
            </div>
          </div>
          <Link href={`/editor?prompt=${encodeURIComponent(dailyPrompt.text)}&examType=${dailyPrompt.examType[0] || 'General'}`} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm flex-shrink-0">
            <PenLine size={16} />
            Write Essay
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: BarChart3, label: 'Average Score', value: recentScores.length ? `${avgScore}/100` : '—', sub: recentScores.length ? getScoreLabel(avgScore) : 'No essays yet', subColor: 'text-muted-foreground' },
          { icon: Star, label: 'Best Score', value: recentScores.length ? `${bestScore}/100` : '—', sub: recentScores.length ? getScoreLabel(bestScore) : 'Submit an essay', subColor: 'text-muted-foreground' },
          { icon: TrendingUp, label: 'Recent Trend', value: trend !== null ? `${trend > 0 ? '+' : ''}${trend}` : '—', sub: trend !== null ? (trend > 0 ? 'Improving!' : trend < 0 ? 'Needs review' : 'Holding steady') : 'Need 2 essays', subColor: trend !== null && trend > 0 ? 'score-good' : trend !== null && trend < 0 ? 'score-poor' : 'text-muted-foreground' },
          { icon: Target, label: 'Essays Written', value: recentScores.length.toString(), sub: 'Total submissions', subColor: 'text-muted-foreground' },
        ].map((stat, i) => (
          <motion.div key={stat.label} className="stat-card" custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <stat.icon size={18} className="text-primary mb-3" strokeWidth={1.75} />
            <div className="text-2xl font-display font-semibold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={`text-xs font-medium mt-0.5 ${stat.subColor}`}>{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground">Recent Essays</h2>
            <Link href="/history" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {!loading && recentScores.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
              <PenLine size={32} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground mb-1">No essays yet</p>
              <p className="text-sm text-muted-foreground mb-4">Write and submit your first essay to get AI feedback.</p>
              <Link href="/editor" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <PenLine size={15} />
                Write First Essay
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScores.map((score, i) => (
                <motion.div key={score.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                  <Link href={`/score/${score.id}`} className="block p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[score.examType]}`}>{score.examType}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={11} />
                            {formatDateTime(score.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{score.prompt || score.essay.slice(0, 80) + '…'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-2xl font-display font-bold ${getScoreColor(score.totalScore)}`}>{score.totalScore}</div>
                        <div className="text-xs text-muted-foreground">/ 100</div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3">
                      {score.rubricScores.map((r) => (
                        <div key={r.dimension} className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" title={`${r.dimension}: ${r.score}/20`}>
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${(r.score / 20) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/editor', icon: PenLine, label: 'New Essay', sub: 'Write and get scored' },
                { href: '/prompts', icon: BookOpen, label: 'Browse Prompts', sub: '20+ exam prompts' },
                { href: '/analytics', icon: BarChart3, label: 'View Analytics', sub: 'Track your progress' },
                { href: '/leaderboard', icon: Target, label: 'Leaderboard', sub: 'See how you rank' },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-foreground/20 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <action.icon size={17} className="text-primary" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.sub}</p>
                  </div>
                  <ArrowRight size={15} className="ml-auto text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
