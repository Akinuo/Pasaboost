import { describe, it, expect } from 'vitest'
import { countWords, calculateVocabularyDiversity, truncateText, validateLeaderboardAlias } from './utils'

describe('countWords', () => {
  it('counts space-separated words', () => {
    expect(countWords('The quick brown fox')).toBe(4)
  })

  it('collapses multiple spaces and newlines', () => {
    expect(countWords('one   two\n\nthree')).toBe(3)
  })

  it('returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
})

describe('calculateVocabularyDiversity', () => {
  it('returns 100 when every word is unique', () => {
    expect(calculateVocabularyDiversity('one two three four')).toBe(100)
  })

  it('returns a lower ratio when words repeat', () => {
    // 2 unique / 4 total = 50
    expect(calculateVocabularyDiversity('one one two two')).toBe(50)
  })

  it('is case-insensitive', () => {
    expect(calculateVocabularyDiversity('Word word WORD')).toBe(Math.round((1 / 3) * 100))
  })

  it('returns 0 for text with no words', () => {
    expect(calculateVocabularyDiversity('123 !!! ---')).toBe(0)
  })
})

describe('truncateText', () => {
  it('leaves short text untouched', () => {
    expect(truncateText('short', 10)).toBe('short')
  })

  it('truncates and appends an ellipsis when over the limit', () => {
    const result = truncateText('this is a long sentence', 10)
    expect(result.length).toBe(10)
    expect(result.endsWith('...')).toBe(true)
  })
})

describe('validateLeaderboardAlias', () => {
  it('accepts a well-formed alias', () => {
    expect(validateLeaderboardAlias('QuietFalcon_42')).toEqual({ valid: true })
  })

  it('rejects aliases that are too short', () => {
    expect(validateLeaderboardAlias('ab').valid).toBe(false)
  })

  it('rejects aliases with spaces or symbols', () => {
    expect(validateLeaderboardAlias('not valid!').valid).toBe(false)
  })

  it('rejects aliases containing blocked words, case-insensitively', () => {
    expect(validateLeaderboardAlias('SuperGagoMan').valid).toBe(false)
    expect(validateLeaderboardAlias('BOBOking123').valid).toBe(false)
  })

  it('trims surrounding whitespace before validating', () => {
    expect(validateLeaderboardAlias('  QuietFalcon_42  ')).toEqual({ valid: true })
  })
})
