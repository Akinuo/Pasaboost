import { describe, it, expect } from 'vitest'
import { computeImprovement, computeLeaderboardRows, computeGroupLeaderboardRows, OVERALL_LEADERBOARD_KEY } from './utils'

describe('computeImprovement', () => {
  it('returns 0 with fewer than 2 scores', () => {
    expect(computeImprovement([])).toBe(0)
    expect(computeImprovement([80])).toBe(0)
  })

  it('is positive when recent scores are higher than earlier ones', () => {
    // recentCount = min(3, floor(6/2)) = 3 -> recent [70,75,80] vs earlier [50,55,60]
    expect(computeImprovement([50, 55, 60, 70, 75, 80])).toBeGreaterThan(0)
  })

  it('is negative when recent scores are lower than earlier ones', () => {
    expect(computeImprovement([80, 75, 70, 60, 55, 50])).toBeLessThan(0)
  })

  it('caps the comparison window at 3 even with many scores', () => {
    // Only the last 3 vs. everything before them should matter.
    const flat = [10, 10, 10, 10, 10, 90, 90, 90]
    const result = computeImprovement(flat)
    // earlier avg = 10, recent avg = 90 -> improvement ~80
    expect(result).toBe(80)
  })
})

describe('computeLeaderboardRows', () => {
  it('builds one Overall row plus one row per distinct exam type', () => {
    const rows = computeLeaderboardRows('u1', 'QuietFalcon_42', [
      { totalScore: 70, examType: 'UPCAT' },
      { totalScore: 80, examType: 'ACET' },
      { totalScore: 90, examType: 'UPCAT' },
    ])
    const examTypes = rows.map((r) => r.exam_type).sort()
    expect(examTypes).toEqual(['ACET', 'Overall', 'UPCAT'].sort())

    const overall = rows.find((r) => r.exam_type === OVERALL_LEADERBOARD_KEY)!
    expect(overall.essay_count).toBe(3)
    expect(overall.best_score).toBe(90)
    expect(overall.average_score).toBe(80) // (70+80+90)/3 = 80

    const upcat = rows.find((r) => r.exam_type === 'UPCAT')!
    expect(upcat.essay_count).toBe(2)
    expect(upcat.average_score).toBe(80) // (70+90)/2 = 80
  })

  it('awards the First 90+ badge when best score crosses 90', () => {
    const rows = computeLeaderboardRows('u1', 'alias', [{ totalScore: 92, examType: 'UPCAT' }])
    expect(rows[0].badge).toBe('⭐ First 90+')
  })

  it('awards a streak badge over the improvement/first-90 badges when streak qualifies', () => {
    const rows = computeLeaderboardRows('u1', 'alias', [{ totalScore: 50, examType: 'UPCAT' }], 30)
    expect(rows[0].badge).toBe('🔥 30-Day Streak')
  })

  it('assigns no badge for a middling, non-improving, streak-less student', () => {
    const rows = computeLeaderboardRows('u1', 'alias', [
      { totalScore: 65, examType: 'UPCAT' },
      { totalScore: 65, examType: 'UPCAT' },
    ])
    expect(rows[0].badge).toBeUndefined()
  })
})

describe('computeGroupLeaderboardRows', () => {
  const members = [
    { userId: 'u1', displayName: 'Ana', photoUrl: null },
    { userId: 'u2', displayName: 'Ben', photoUrl: null },
    { userId: 'u3', displayName: 'Cara', photoUrl: null }, // no essays yet
  ]

  it('ranks members by average score, descending', () => {
    const rows = computeGroupLeaderboardRows(members, [
      { user_id: 'u1', total_score: 70 },
      { user_id: 'u2', total_score: 90 },
    ], 'u1')
    expect(rows[0].userId).toBe('u2')
    expect(rows[0].rank).toBe(1)
    expect(rows[1].userId).toBe('u1')
  })

  it('sorts members with zero essays to the bottom regardless of score ties', () => {
    const rows = computeGroupLeaderboardRows(members, [
      { user_id: 'u1', total_score: 60 },
    ], 'u1')
    expect(rows[rows.length - 1].userId).toBe('u3')
    expect(rows[rows.length - 1].essayCount).toBe(0)
  })

  it('breaks ties on average score by essay count', () => {
    const rows = computeGroupLeaderboardRows(members.slice(0, 2), [
      { user_id: 'u1', total_score: 80 },
      { user_id: 'u2', total_score: 80 },
      { user_id: 'u2', total_score: 80 },
    ], 'u1')
    expect(rows[0].userId).toBe('u2') // same avg, more essays
    expect(rows[0].essayCount).toBe(2)
  })

  it('flags isYou correctly for the current user', () => {
    const rows = computeGroupLeaderboardRows(members, [], 'u2')
    expect(rows.find((r) => r.userId === 'u2')?.isYou).toBe(true)
    expect(rows.find((r) => r.userId === 'u1')?.isYou).toBe(false)
  })
})
