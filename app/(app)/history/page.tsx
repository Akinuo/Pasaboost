'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Filter, Clock, ChevronRight, FileText, PenLine, Download, Users } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getUserScores, getProfile } from '@/lib/queries'
import { getScoreColor, getScoreBgColor, getScoreLabel, formatDate, EXAM_COLORS, truncateText } from '@/lib/utils'
import { exportPortfolioToPDF } from '@/lib/pdfExport'
import SharePostModal from '@/components/community/SharePostModal'
import type { EssayScore, ExamType } from '@/types'

const EXAM_FILTERS: Array<ExamType | 'All'> = ['All', 'UPCAT', 'ACET', 'DCAT', 'USTET', 'General']

export default function HistoryPage() {
  const { user } = useAuth()
  const [scores, setScores] = useState<EssayScore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [examFilter, setExamFilter] = useState<ExamType | 'All'>('All')
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [shareTarget, setShareTarget] = useState<EssayScore | null>(null)
  const [displayName, setDisplayName] = useState('Student')

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    getProfile(supabase, user.id).then((p) => {
      setDisplayName(p?.displayName || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Student')
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    getUserScores(supabase, user.id, { limit: 100 }).then((s) => {
      setScores(s)
      setLoading(false)
    })

    const channel = supabase
      .channel('history-scores')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores', filter: `user_id=eq.${user.id}` },
        () => getUserScores(supabase, user.id, { limit: 100 }).then(setScores))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const filtered = scores
    .filter((s) => {
      const matchesSearch = !search || s.essay.toLowerCase().includes(search.toLowerCase()) || s.prompt?.toLowerCase().includes(search.toLowerCase())
      const matchesExam = examFilter === 'All' || s.examType === examFilter
      return matchesSearch && matchesExam
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.getTime() - a.createdAt.getTime()
      if (sortBy === 'highest') return b.totalScore - a.totalScore
      return a.totalScore - b.totalScore
    })

  const handleExportPortfolio = () => {
    if (filtered.length === 0) return
    const studentName = (user?.user_metadata?.display_name as string | undefined) || undefined
    exportPortfolioToPDF(filtered, studentName)
  }

  if (loading) return <HistorySkeleton />

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">My Essays</h1>
          <p className="page-subtitle">{scores.length} scored essay{scores.length !== 1 ? 's' : ''}</p>
        </div>
        {scores.length > 0 && (
          <button
            onClick={handleExportPortfolio}
            title="Export a printable PDF of the essays currently shown below"
            className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border rounded-lg bg-background hover:bg-accent transition-colors flex-shrink-0"
          >
            <Download size={15} />
            Export Portfolio
          </button>
        )}
      </div>

      {scores.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-16 text-center">
          <FileText size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">No essays yet</h2>
          <p className="text-muted-foreground mb-6">Submit your first essay to start building your history.</p>
          <Link href="/editor" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            <PenLine size={16} />
            Write First Essay
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search essays…" className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {EXAM_FILTERS.map((ef) => (
                <button key={ef} onClick={() => setExamFilter(ef)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${examFilter === ef ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  {ef}
                </button>
              ))}
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="pl-8 pr-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
                <option value="newest">Newest first</option>
                <option value="highest">Highest score</option>
                <option value="lowest">Lowest score</option>
              </select>
            </div>
          </div>

          {(search || examFilter !== 'All') && (
            <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {scores.length} essays</p>
          )}

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No essays match your filters.</div>
            ) : (
              filtered.map((score, i) => (
                <motion.div key={score.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/score/${score.id}`} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all group">
                    <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border ${getScoreBgColor(score.totalScore)}`}>
                      <span className={`text-lg font-display font-semibold leading-none ${getScoreColor(score.totalScore)}`}>{score.totalScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[score.examType]}`}>{score.examType}</span>
                        <span className={`text-xs font-medium ${getScoreColor(score.totalScore)}`}>{getScoreLabel(score.totalScore)}</span>
                      </div>
                      <p className="text-sm text-foreground font-medium line-clamp-1">{score.prompt ? truncateText(score.prompt, 80) : truncateText(score.essay, 80)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock size={10} />{formatDate(score.createdAt)}</p>
                    </div>
                    <div className="hidden sm:flex gap-0.5 items-end h-8">
                      {score.rubricScores.map((r) => (
                        <div key={r.dimension} className="w-3 rounded-sm bg-primary/30 relative overflow-hidden" style={{ height: '100%' }} title={`${r.dimension}: ${r.score}/20`}>
                          <div className="absolute bottom-0 inset-x-0 bg-primary/70 rounded-sm" style={{ height: `${(r.score / 20) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareTarget(score) }}
                      title="Share to Community"
                      className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                      aria-label="Share to Community"
                    >
                      <Users size={16} />
                    </button>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {user && shareTarget && (
        <SharePostModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          onShared={(postId) => { window.location.href = `/community/${postId}` }}
          userId={user.id}
          displayName={displayName}
          defaults={{
            title: shareTarget.prompt ? shareTarget.prompt.slice(0, 100) : 'My Essay',
            essay: shareTarget.essay,
            examType: shareTarget.examType,
            prompt: shareTarget.prompt,
            scoreId: shareTarget.id,
            totalScore: shareTarget.totalScore,
          }}
        />
      )}
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-muted rounded-lg" />
        <div className="h-10 w-48 bg-muted rounded-lg" />
      </div>
      {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
    </div>
  )
}
