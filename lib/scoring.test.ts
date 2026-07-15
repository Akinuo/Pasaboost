import { describe, it, expect } from 'vitest'
import { getScoreBand, getAIPenalty, getWeakestDimension } from './utils'

describe('getScoreBand', () => {
  it('returns Excellent at and above 90', () => {
    expect(getScoreBand(90)).toBe('Excellent (90-100)')
    expect(getScoreBand(100)).toBe('Excellent (90-100)')
  })

  it('returns Proficient just below the Excellent cutoff', () => {
    expect(getScoreBand(89)).toBe('Proficient (75-89)')
    expect(getScoreBand(75)).toBe('Proficient (75-89)')
  })

  it('returns Developing just below the Proficient cutoff', () => {
    expect(getScoreBand(74)).toBe('Developing (60-74)')
    expect(getScoreBand(60)).toBe('Developing (60-74)')
  })

  it('returns Beginning just below the Developing cutoff', () => {
    expect(getScoreBand(59)).toBe('Beginning (45-59)')
    expect(getScoreBand(45)).toBe('Beginning (45-59)')
  })

  it('returns Needs Improvement below 45', () => {
    expect(getScoreBand(44)).toBe('Needs Improvement (<45)')
    expect(getScoreBand(0)).toBe('Needs Improvement (<45)')
  })
})

describe('getAIPenalty', () => {
  it('applies no penalty below the 60 threshold', () => {
    expect(getAIPenalty(59)).toBe(0)
    expect(getAIPenalty(0)).toBe(0)
  })

  it('applies no penalty when likelihood is unknown', () => {
    expect(getAIPenalty(null)).toBe(0)
    expect(getAIPenalty(undefined)).toBe(0)
  })

  it('steps up through each tier at its exact boundary', () => {
    expect(getAIPenalty(60)).toBe(10)
    expect(getAIPenalty(69)).toBe(10)
    expect(getAIPenalty(70)).toBe(20)
    expect(getAIPenalty(79)).toBe(20)
    expect(getAIPenalty(80)).toBe(30)
    expect(getAIPenalty(89)).toBe(30)
    expect(getAIPenalty(90)).toBe(40)
    expect(getAIPenalty(100)).toBe(40)
  })
})

describe('getWeakestDimension', () => {
  it('returns null below the minimum sample size', () => {
    const scores = [
      { rubricScores: [{ dimension: 'Content' as const, score: 10 }] },
      { rubricScores: [{ dimension: 'Content' as const, score: 10 }] },
    ]
    expect(getWeakestDimension(scores, 3)).toBeNull()
  })

  it('picks the lowest-averaging dimension across scores', () => {
    const scores = [
      { rubricScores: [{ dimension: 'Content' as const, score: 18 }, { dimension: 'Grammar' as const, score: 8 }] },
      { rubricScores: [{ dimension: 'Content' as const, score: 16 }, { dimension: 'Grammar' as const, score: 10 }] },
      { rubricScores: [{ dimension: 'Content' as const, score: 17 }, { dimension: 'Grammar' as const, score: 9 }] },
    ]
    const result = getWeakestDimension(scores, 3)
    expect(result?.dimension).toBe('Grammar')
    expect(result?.averageScore).toBeCloseTo(9)
    expect(result?.sampleSize).toBe(3)
  })

  it('respects a custom minSamples threshold', () => {
    const scores = [
      { rubricScores: [{ dimension: 'Content' as const, score: 5 }] },
    ]
    expect(getWeakestDimension(scores, 1)).not.toBeNull()
    expect(getWeakestDimension(scores, 2)).toBeNull()
  })
})
