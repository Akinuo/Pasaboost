'use client'

// ============================================================
// WeeklyGoalCard
// Sidebar widget surfacing two numbers that already exist in
// user_stats (weekly_goal, this_week_count, current_streak,
// longest_streak) but previously had no home in the UI. The goal
// is adjustable in place — no separate settings page round-trip.
// ============================================================

import { useState } from 'react'
import { Flame, Minus, Plus } from 'lucide-react'

interface WeeklyGoalCardProps {
  weeklyGoal: number
  thisWeekCount: number
  currentStreak: number
  longestStreak: number
  onChangeGoal: (goal: number) => void
}

export default function WeeklyGoalCard({ weeklyGoal, thisWeekCount, currentStreak, longestStreak, onChangeGoal }: WeeklyGoalCardProps) {
  const [pending, setPending] = useState<number | null>(null)
  const displayGoal = pending ?? weeklyGoal
  const pct = displayGoal > 0 ? Math.min(100, Math.round((thisWeekCount / displayGoal) * 100)) : 0

  const adjust = (delta: number) => {
    const next = Math.min(14, Math.max(1, displayGoal + delta))
    if (next === displayGoal) return
    setPending(next)
    onChangeGoal(next)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold text-sm text-foreground">This Week&apos;s Goal</h3>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => adjust(-1)} className="w-6 h-6 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Lower weekly goal">
            <Minus size={12} />
          </button>
          <span className="text-xs font-medium text-foreground w-12 text-center">{displayGoal}/wk</span>
          <button type="button" onClick={() => adjust(1)} className="w-6 h-6 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Raise weekly goal">
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{thisWeekCount} of {displayGoal} essays this week</p>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
        <Flame size={13} className={currentStreak > 0 ? 'text-primary' : 'text-muted-foreground'} />
        <span className="text-xs text-muted-foreground">
          {currentStreak > 0 ? <><strong className="text-foreground font-medium">{currentStreak}-day</strong> streak</> : 'No active streak yet'}
          {longestStreak > currentStreak && longestStreak > 0 ? ` · best ${longestStreak}` : ''}
        </span>
      </div>
    </div>
  )
}
