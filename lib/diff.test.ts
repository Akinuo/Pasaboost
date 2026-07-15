import { describe, it, expect } from 'vitest'
import { diffWords } from './utils'

// Helper: reassemble the "new" text from a diff (same + added tokens)
// and the "old" text from a diff (same + removed tokens), to check
// the diff is actually a faithful edit script, not just plausible-looking.
function reconstructNew(tokens: ReturnType<typeof diffWords>): string {
  return tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('')
}
function reconstructOld(tokens: ReturnType<typeof diffWords>): string {
  return tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('')
}

describe('diffWords', () => {
  it('returns a single same-type token for identical text', () => {
    const tokens = diffWords('The quick fox', 'The quick fox')
    expect(tokens).toEqual([{ type: 'same', text: 'The quick fox' }])
  })

  it('detects a pure insertion', () => {
    const tokens = diffWords('The fox jumps', 'The quick fox jumps')
    expect(tokens.some((t) => t.type === 'added' && t.text.includes('quick'))).toBe(true)
    expect(reconstructOld(tokens)).toBe('The fox jumps')
    expect(reconstructNew(tokens)).toBe('The quick fox jumps')
  })

  it('detects a pure deletion', () => {
    const tokens = diffWords('The quick fox jumps', 'The fox jumps')
    expect(tokens.some((t) => t.type === 'removed' && t.text.includes('quick'))).toBe(true)
    expect(reconstructOld(tokens)).toBe('The quick fox jumps')
    expect(reconstructNew(tokens)).toBe('The fox jumps')
  })

  it('detects a word substitution as remove+add rather than treating everything as changed', () => {
    const tokens = diffWords('The fox is fast', 'The fox is slow')
    expect(reconstructOld(tokens)).toBe('The fox is fast')
    expect(reconstructNew(tokens)).toBe('The fox is slow')
    // "The fox is " should be preserved as unchanged context, not
    // rewritten as a full-line replacement.
    const sameText = tokens.filter((t) => t.type === 'same').map((t) => t.text).join('')
    expect(sameText).toContain('The')
    expect(sameText).toContain('fox')
  })

  it('handles empty strings', () => {
    expect(diffWords('', '')).toEqual([])
    expect(reconstructNew(diffWords('', 'hello world'))).toBe('hello world')
    expect(reconstructOld(diffWords('hello world', ''))).toBe('hello world')
  })

  it('preserves paragraph breaks (double newlines) as part of the token stream', () => {
    const tokens = diffWords('Para one.\n\nPara two.', 'Para one.\n\nPara two revised.')
    expect(reconstructOld(tokens)).toBe('Para one.\n\nPara two.')
    expect(reconstructNew(tokens)).toBe('Para one.\n\nPara two revised.')
  })

  it('always produces an edit script that reconstructs both inputs exactly', () => {
    const cases: Array<[string, string]> = [
      ['a b c d e', 'a x c d y e'],
      ['one two three', 'three two one'],
      ['Repeated repeated word word here', 'Repeated word here'],
    ]
    for (const [oldText, newText] of cases) {
      const tokens = diffWords(oldText, newText)
      expect(reconstructOld(tokens)).toBe(oldText)
      expect(reconstructNew(tokens)).toBe(newText)
    }
  })
})
