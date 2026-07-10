'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Crown, Star, TrendingUp, Info, Shield } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getLeaderboard, getUserScores } from '@/lib/queries'
import { getScoreColor } from '@/lib/utils'
import type { LeaderboardEntry, ExamType } from '@/types'

const EXAM_TABS: Array<{ label: string; value: ExamType | undefined }> = [
  { label: 'Overall', value: undefined },
  { label: 'UPCAT', value: 'UPCAT' },
  { label: 'ACET', value: 'ACET' },
  { label: 'DCAT', value: 'DCAT' },
  { label: 'USTET', value: 'USTET' },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeExam, setActiveExam] = useState<ExamType | undefined>(undefined)
  const [userAvgScore, setUserAvgScore] = useState<number | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      setLoading(true)
      const [lb, userScores] = await Promise.all([
        getLeaderboard(supabase, activeExam, 20),
        user ? getUserScores(supabase, user.id, { examType: activeExam, limit: 50 }) : Promise.resolve([]),
      ])
      if (cancelled) return

      setEntries(lb)

      if (userScores.length > 0) {
        const avg = Math.round(userScores.reduce((s, e) => s + e.totalScore, 0) / userScores.length)
        setUserAvgScore(avg)
        const rank = lb.findIndex((e) => e.alias === user?.user_metadata?.leaderboard_alias) + 1
        setUserRank(rank > 0 ? rank : null)
      }

      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [activeExam, user])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Trophy size={28} className="text-primary" />
          Leaderboard
        </h1>
        <p className="page-subtitle">Anonymous rankings based on average essay scores</p>
      </div>

      <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/60 border border-border mb-6">
        <Shield size={15} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          The leaderboard is <strong>anonymous</strong>. Aliases are auto-generated. Enable leaderboard participation in your <strong>Profile settings</strong> to appear here.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
        {EXAM_TABS.map((tab) => (
          <button key={tab.label} onClick={() => setActiveExam(tab.value)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-w-fit ${activeExam === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {!loading && entries.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Trophy size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">No leaderboard entries yet</p>
          <p className="text-sm text-muted-foreground">Be the first to opt in from your Profile settings!</p>
        </div>
      )}

      {!loading && entries.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground mb-1">2</div>
            <div className="text-xs font-medium text-foreground mb-2">{entries[1].alias}</div>
            <div className="w-20 h-20 bg-card rounded-lg flex flex-col items-center justify-center border border-border">
              <div className="text-xl font-display font-semibold text-foreground">{entries[1].averageScore}</div>
              <div className="text-xs text-muted-foreground">avg</div>
            </div>
          </motion.div>
          <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Crown size={20} className="text-primary mb-1" />
            <div className="text-sm font-semibold text-foreground mb-2">{entries[0].alias}</div>
            <div className="w-24 h-24 bg-primary/[0.06] rounded-lg flex flex-col items-center justify-center border border-primary/30">
              <div className="text-2xl font-display font-semibold text-primary">{entries[0].averageScore}</div>
              <div className="text-xs text-muted-foreground">avg</div>
            </div>
          </motion.div>
          <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground mb-1">3</div>
            <div className="text-xs font-medium text-foreground mb-2">{entries[2].alias}</div>
            <div className="w-16 h-16 bg-card rounded-lg flex flex-col items-center justify-center border border-border">
              <div className="text-lg font-display font-semibold text-foreground">{entries[2].averageScore}</div>
              <div className="text-xs text-muted-foreground">avg</div>
            </div>
          </motion.div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      ) : entries.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Student</div>
            <div className="col-span-2 text-center">Avg Score</div>
            <div className="col-span-2 text-center">Essays</div>
            <div className="col-span-2 text-center">Progress</div>
          </div>
          <div className="divide-y divide-border">
            {entries.map((entry, i) => (
              <motion.div key={entry.alias} className={`grid grid-cols-12 items-center px-4 py-4 hover:bg-muted/30 transition-colors ${i < 3 ? 'bg-primary/[0.03]' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.5) }}>
                <div className="col-span-1">
                  <span className="text-sm font-mono font-semibold text-muted-foreground">{entry.rank}</span>
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">{entry.alias[0].toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.alias}</p>
                    {entry.badge && <p className="text-xs text-muted-foreground">{entry.badge}</p>}
                  </div>
                </div>
                <div className={`col-span-2 text-center text-lg font-display font-bold ${getScoreColor(entry.averageScore)}`}>{entry.averageScore}</div>
                <div className="col-span-2 text-center text-sm text-muted-foreground">{entry.essayCount}</div>
                <div className="col-span-2 text-center">
                  <span className={`text-sm font-medium flex items-center justify-center gap-1 ${entry.improvement > 0 ? 'score-good' : 'text-muted-foreground'}`}>
                    {entry.improvement > 0 && <TrendingUp size={12} />}
                    {entry.improvement > 0 ? `+${entry.improvement}` : '—'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {userAvgScore !== null && (
        <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
          <Star size={16} className="text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Your position</p>
            <p className="text-xs text-muted-foreground">
              Average score: <strong>{userAvgScore}/100</strong>{userRank && ` · Rank #${userRank}`}
            </p>
          </div>
          <Info size={14} className="text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
