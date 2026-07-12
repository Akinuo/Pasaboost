'use client'

// ============================================================
// ExamCountdownCard
// Lives in the dashboard's top "right now" row, beside Today's
// Prompt. Two states:
//  - Not set: compact inline goal-setting form (exam type + date)
//  - Set: days-remaining countdown + a pacing plan derived from
//    the student's existing user_stats (weekly_goal, this_week_count,
//    total_essays) — no separate "target essay count" field to
//    manage, just today's numbers measured against the deadline.
// Styled to match the Today's Prompt hero (bg-foreground/text-background
// inverts with the site theme) so the two form one "action zone".
// ============================================================

import { useState } from 'react'
import { CalendarClock, Pencil, PartyPopper } from 'lucide-react'
import { EXAM_COLORS, daysUntilManila, formatDate, todayInManila } from '@/lib/utils'
import type { ExamType } from '@/types'

const EXAM_TYPES: ExamType[] = ['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']

interface ExamCountdownCardProps {
  examType: ExamType | null
  examDate: string | null
  weeklyGoal: number
  thisWeekCount: number
  totalEssays: number
  saving: boolean
  onSave: (examType: ExamType, examDate: string) => void
}

export default function ExamCountdownCard({
  examType, examDate, weeklyGoal, thisWeekCount, totalEssays, saving, onSave,
}: ExamCountdownCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftType, setDraftType] = useState<ExamType>(examType ?? 'UPCAT')
  const [draftDate, setDraftDate] = useState(examDate ?? '')

  const showForm = editing || !examDate

  const handleSave = () => {
    if (!draftDate) return
    onSave(draftType, draftDate)
    setEditing(false)
  }

  if (showForm) {
    return (
      <div className="p-6 rounded-lg bg-foreground text-background h-full flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock size={16} className="text-primary" />
          <span className="text-xs font-medium text-background/60 uppercase tracking-wider">Exam Countdown</span>
        </div>
        <p className="text-sm text-background/80 mb-4 leading-snug">
          Set your target exam to see a countdown and pacing plan here.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {EXAM_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDraftType(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                draftType === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/10 text-background/70 border-background/20 hover:bg-background/15'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={draftDate}
          min={todayInManila()}
          onChange={(e) => setDraftDate(e.target.value)}
          className="w-full px-3 py-2 mb-3 rounded-lg text-sm bg-background/10 border border-background/20 text-background [color-scheme:dark] dark:[color-scheme:light] focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-auto flex items-center gap-2">
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg text-xs font-medium text-background/70 hover:text-background transition-colors">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!draftDate || saving}
            className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Set Goal'}
          </button>
        </div>
      </div>
    )
  }

  const daysLeft = daysUntilManila(examDate)
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))
  const projectedTotal = totalEssays + weeksLeft * weeklyGoal
  const onPaceThisWeek = thisWeekCount >= weeklyGoal

  return (
    <div className="p-6 rounded-lg bg-foreground text-background h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-primary" />
          <span className="text-xs font-medium text-background/60 uppercase tracking-wider">Exam Countdown</span>
        </div>
        <button type="button" onClick={() => { setDraftType(examType ?? 'UPCAT'); setDraftDate(examDate); setEditing(true) }} className="text-background/50 hover:text-background transition-colors" title="Change exam goal">
          <Pencil size={13} />
        </button>
      </div>

      {daysLeft > 0 ? (
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-display font-semibold text-background">{daysLeft}</span>
          <span className="text-sm text-background/70">day{daysLeft === 1 ? '' : 's'} left</span>
        </div>
      ) : daysLeft === 0 ? (
        <div className="flex items-center gap-2 mb-1">
          <PartyPopper size={22} className="text-primary" />
          <span className="text-lg font-display font-semibold text-background">Exam day is today!</span>
        </div>
      ) : (
        <div className="mb-1">
          <span className="text-lg font-display font-semibold text-background">Exam day has passed</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {examType && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[examType]}`}>{examType}</span>}
        <span className="text-xs text-background/60">{formatDate(`${examDate}T00:00:00`)}</span>
      </div>

      {daysLeft >= 0 && (
        <div className="mt-auto pt-3 border-t border-background/15">
          <p className="text-xs text-background/80 leading-relaxed">
            Aiming for <strong className="text-background">{weeklyGoal}/week</strong>, you&apos;re on pace for{' '}
            <strong className="text-background">~{projectedTotal} essays</strong> by exam day.
          </p>
          <p className={`text-xs mt-1 font-medium ${onPaceThisWeek ? 'text-background/60' : 'text-background'}`}>
            {onPaceThisWeek
              ? `On pace this week (${thisWeekCount}/${weeklyGoal}) ✓`
              : `${weeklyGoal - thisWeekCount} more this week to stay on pace (${thisWeekCount}/${weeklyGoal})`}
          </p>
        </div>
      )}
    </div>
  )
}
