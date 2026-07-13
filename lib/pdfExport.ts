// ============================================================
// PDF Export — Essay Score Report & Essay Portfolio
// Builds clean, text-based PDFs client-side with jsPDF (no
// canvas/screenshot step, so they stay crisp and small). Colors
// below are hand-converted from the app's own HSL design tokens
// (see app/globals.css) so exported PDFs match the product
// instead of inventing a separate palette.
// ============================================================

import { jsPDF } from 'jspdf'
import type { EssayScore, ScoreDimension, ExamType, GrammarIssueType } from '@/types'
import { formatDate } from '@/lib/utils'

type RGB = [number, number, number]

const COLOR = {
  navy: [15, 23, 42] as RGB, // header band — matches the app's dark background
  ink: [15, 23, 41] as RGB, // --foreground
  muted: [100, 106, 118] as RGB, // --muted-foreground
  border: [222, 225, 230] as RGB, // --border
  cardBg: [241, 243, 246] as RGB, // lightened --muted, used for stat tiles
  white: [255, 255, 255] as RGB,

  primary: [11, 97, 234] as RGB, // --primary / --chart-1 / --score-good
  teal: [39, 140, 155] as RGB, // --chart-2
  purple: [118, 78, 188] as RGB, // --chart-3
  amberChart: [189, 135, 40] as RGB, // --chart-4
  slate: [103, 111, 126] as RGB, // --chart-5

  excellent: [45, 118, 91] as RGB, // --score-excellent
  good: [11, 97, 234] as RGB, // --score-good
  average: [147, 103, 26] as RGB, // --score-average
  poor: [189, 40, 40] as RGB, // --score-poor
}

const DIMENSION_COLOR: Record<ScoreDimension, RGB> = {
  Content: COLOR.primary,
  Organization: COLOR.teal,
  Grammar: COLOR.purple,
  Coherence: COLOR.amberChart,
  Argument: COLOR.slate,
}

const EXAM_COLOR: Record<ExamType, RGB> = {
  UPCAT: COLOR.primary,
  ACET: COLOR.teal,
  DCAT: COLOR.purple,
  USTET: COLOR.amberChart,
  General: COLOR.slate,
}

const GRAMMAR_TYPE_COLOR: Record<GrammarIssueType, RGB> = {
  grammar: COLOR.primary,
  spelling: COLOR.purple,
  punctuation: COLOR.teal,
  style: COLOR.amberChart,
}

function bandColor(score: number): RGB {
  if (score >= 85) return COLOR.excellent
  if (score >= 70) return COLOR.good
  if (score >= 55) return COLOR.average
  return COLOR.poor
}

// Blends a color toward white — used for tinted card backgrounds.
function tint(rgb: RGB, amount: number): RGB {
  return rgb.map((c) => Math.round(c + (255 - c) * amount)) as RGB
}

const PAGE_W = 210 // A4 mm
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2
const HEADER_H = 40
const FOOTER_ZONE = 16 // reserved bottom space before a page break triggers

// Fetches the app logo as raw bytes so it can be embedded in the PDF header.
// Returns null (rather than throwing) if it can't be loaded, so a hiccup
// fetching a static asset never breaks PDF generation.
async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const res = await fetch('/logo-512.png')
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

interface HeadingOpts {
  size?: number
  color?: RGB
  spaceBefore?: number
  accent?: RGB
}

interface ParagraphOpts {
  size?: number
  color?: RGB
  indent?: number
}

interface HeaderOpts {
  eyebrow?: string
  title: string
  metaLeft: string
  metaBadge?: string
  metaBadgeColor?: RGB
  scoreText?: string
  bandText?: string
  bandCol?: RGB
}

// Stateful helper that owns the jsPDF document and the running y-cursor,
// plus a small set of drawing primitives shared by both report types below.
class PdfReport {
  doc: jsPDF
  y: number
  private logoBytes: Uint8Array | null
  private continuation: HeaderOpts | null = null

  constructor(logoBytes: Uint8Array | null) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' })
    this.y = MARGIN
    this.logoBytes = logoBytes
  }

  private setFill(rgb: RGB) { this.doc.setFillColor(rgb[0], rgb[1], rgb[2]) }
  private setDraw(rgb: RGB) { this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]) }
  private setText(rgb: RGB) { this.doc.setTextColor(rgb[0], rgb[1], rgb[2]) }

  // Breaks to a new page if `needed` mm won't fit above the footer zone.
  // Overflow pages get a slim branded strip (rather than blank white space)
  // repeating whatever header was most recently drawn.
  ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - FOOTER_ZONE) {
      this.doc.addPage()
      if (this.continuation) {
        this.drawHeader(this.continuation, false)
      } else {
        this.y = MARGIN
      }
    }
  }

  // tall=true: the full title block, used once at the top of a document.
  // tall=false: a slim continuation strip for overflow / per-entry pages.
  drawHeader(opts: HeaderOpts, tall = true) {
    const { eyebrow, title, metaLeft, metaBadge, metaBadgeColor, scoreText, bandText, bandCol } = opts
    const h = tall ? HEADER_H : 16
    this.setFill(COLOR.navy)
    this.doc.rect(0, 0, PAGE_W, h, 'F')

    if (tall) {
      const badge = 12
      const bx = MARGIN, by = 9
      let textStartX = MARGIN
      if (this.logoBytes) {
        this.setFill(COLOR.white)
        this.doc.roundedRect(bx, by, badge, badge, 2.2, 2.2, 'F')
        const pad = 1.6
        this.doc.addImage(this.logoBytes, 'PNG', bx + pad, by + pad, badge - pad * 2, badge - pad * 2)
        textStartX = bx + badge + 4
      }

      if (eyebrow) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(8.5)
        this.setText(tint(COLOR.primary, 0.55))
        this.doc.text(eyebrow.toUpperCase(), textStartX, 13, { charSpace: 0.4 })
      }

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(16.5)
      this.setText(COLOR.white)
      this.doc.text(title, textStartX, 21)

      // Meta row: optional exam-type chip + date/description
      let mx = textStartX
      const my = 28
      if (metaBadge) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(8)
        const tw = this.doc.getTextWidth(metaBadge) + 5
        this.setFill(metaBadgeColor ?? COLOR.primary)
        this.doc.roundedRect(mx, my - 3.6, tw, 5.2, 1.3, 1.3, 'F')
        this.setText(COLOR.white)
        this.doc.text(metaBadge, mx + tw / 2, my, { align: 'center' })
        mx += tw + 3
      }
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9.5)
      this.doc.setTextColor(205, 214, 235)
      this.doc.text(metaLeft, mx, my)

      // Right side: big score + colored band pill
      if (scoreText) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(23)
        this.setText(COLOR.white)
        this.doc.text(scoreText, PAGE_W - MARGIN, 21, { align: 'right' })
      }
      if (bandText) {
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(8.5)
        const tw = this.doc.getTextWidth(bandText) + 6
        this.setFill(bandCol ?? COLOR.good)
        this.doc.roundedRect(PAGE_W - MARGIN - tw, 25, tw, 5.6, 1.4, 1.4, 'F')
        this.setText(COLOR.white)
        this.doc.text(bandText, PAGE_W - MARGIN - tw / 2, 28.8, { align: 'center' })
      }
    } else {
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9.5)
      this.setText(COLOR.white)
      this.doc.text(title, MARGIN, 10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8)
      this.doc.setTextColor(205, 214, 235)
      this.doc.text(metaLeft, PAGE_W - MARGIN, 10, { align: 'right' })
    }

    this.y = h + 10
    this.continuation = opts
  }

  // Section heading with a small colored accent tick to its left.
  heading(text: string, opts: HeadingOpts = {}) {
    const { size = 12.5, color = COLOR.ink, spaceBefore = 3, accent = COLOR.primary } = opts
    this.ensureSpace(12)
    this.y += spaceBefore
    this.setFill(accent)
    this.doc.roundedRect(MARGIN, this.y - 3.2, 1.3, 4.4, 0.6, 0.6, 'F')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(size)
    this.setText(color)
    this.doc.text(text, MARGIN + 4, this.y)
    this.y += size / 2.6 + 2.6
  }

  paragraph(text: string, opts: ParagraphOpts = {}) {
    const { size = 9.7, color = COLOR.muted, indent = 0 } = opts
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(size)
    this.setText(color)
    const lines: string[] = this.doc.splitTextToSize(text, CONTENT_W - indent)
    for (const line of lines) {
      this.ensureSpace(5.6)
      this.doc.text(line, MARGIN + indent, this.y)
      this.y += 4.6
    }
    this.y += 1.5
  }

  // Measures how tall a bullet list will render at the given font size —
  // used to size a card box *before* drawing it, so its background never
  // gets painted on top of (and hides) the text.
  measureBulletHeight(items: string[], size = 9.5): number {
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(size)
    let lines = 0
    for (const item of items) lines += this.doc.splitTextToSize(item, CONTENT_W - 11).length
    return lines * 4.6
  }

  // Colored-dot bullet list. Assumes the caller already reserved enough
  // room (see `card()`) — it does not paginate itself.
  bulletList(items: string[], dotColor: RGB = COLOR.primary, size = 9.5) {
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(size)
    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, CONTENT_W - 11)
      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          this.setFill(dotColor)
          this.doc.circle(MARGIN + 4.5, this.y - 1.3, 0.9, 'F')
        }
        this.setText(COLOR.ink)
        this.doc.text(lines[i], MARGIN + 7.9, this.y)
        this.y += 4.6
      }
    }
  }

  // Labeled horizontal score bar (score out of maxScore).
  scoreBar(label: string, score: number, maxScore: number, color: RGB) {
    this.ensureSpace(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(9.5)
    this.setText(COLOR.ink)
    this.doc.text(label, MARGIN, this.y)
    this.setText(color)
    this.doc.text(`${score}/${maxScore}`, PAGE_W - MARGIN, this.y, { align: 'right' })
    this.y += 3.2

    const trackW = CONTENT_W
    const trackH = 2.6
    this.setFill(COLOR.cardBg)
    this.doc.roundedRect(MARGIN, this.y, trackW, trackH, 1.3, 1.3, 'F')
    const fillW = Math.max((score / maxScore) * trackW, trackH)
    this.setFill(color)
    this.doc.roundedRect(MARGIN, this.y, fillW, trackH, 1.3, 1.3, 'F')
    this.y += trackH + 5
  }

  // Small filled pill of text — returns the width it consumed.
  chip(text: string, x: number, y: number, color: RGB, textColor: RGB = COLOR.white): number {
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(7.3)
    const w = this.doc.getTextWidth(text) + 4.4
    this.setFill(color)
    this.doc.roundedRect(x, y - 3.3, w, 4.6, 1.1, 1.1, 'F')
    this.setText(textColor)
    this.doc.text(text, x + w / 2, y, { align: 'center' })
    this.doc.setFont('helvetica', 'normal')
    return w
  }

  // Tinted card with a colored left rule. `innerHeight` must be the exact
  // content height `drawFn` is about to draw (see measureBulletHeight, or
  // manual splitTextToSize line-counting) — the box is drawn before drawFn
  // runs, so content always paints on top of the fill, never under it.
  card(accent: RGB, innerHeight: number, drawFn: () => void) {
    this.ensureSpace(innerHeight + 8)
    const top = this.y
    this.setFill(tint(accent, 0.9))
    this.doc.roundedRect(MARGIN, top, CONTENT_W, innerHeight, 1.8, 1.8, 'F')
    this.setFill(accent)
    this.doc.roundedRect(MARGIN, top, 1.3, innerHeight, 0.6, 0.6, 'F')
    this.y = top + 4.4
    drawFn()
    this.y = top + innerHeight + 4.5
  }

  // Heading + tinted bullet-list card together, kept off a page break.
  labeledCard(title: string, items: string[], accent: RGB) {
    if (items.length === 0) return
    const bodyH = this.measureBulletHeight(items, 9.5)
    this.ensureSpace(bodyH + 24)
    this.heading(title, { accent, size: 11.5 })
    this.card(accent, bodyH + 6, () => this.bulletList(items, accent, 9.5))
  }

  finalizeFooters(brandLine: string) {
    const total = this.doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i)
      this.setDraw(COLOR.border)
      this.doc.setLineWidth(0.2)
      this.doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.6)
      this.setText(COLOR.muted)
      this.doc.text(brandLine, MARGIN, PAGE_H - 7.5)
      this.doc.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, PAGE_H - 7.5, { align: 'right' })
    }
  }
}

const BRAND_FOOTER = 'PasaBoost \u00B7 AI Essay Coach for Philippine College Exams'

// ============================================================
// Single essay score report
// ============================================================
export async function exportScoreToPDF(score: EssayScore) {
  const logoBytes = await loadLogoBytes()
  const r = new PdfReport(logoBytes)
  const band = bandColor(score.totalScore)

  r.drawHeader({
    eyebrow: 'PasaBoost',
    title: 'Essay Score Report',
    metaBadge: score.examType,
    metaBadgeColor: EXAM_COLOR[score.examType] ?? COLOR.slate,
    metaLeft: formatDate(score.createdAt),
    scoreText: `${score.totalScore}/100`,
    bandText: score.estimatedBand,
    bandCol: band,
  })

  if (score.prompt) {
    r.heading('Essay Prompt', { size: 11.5 })
    r.paragraph(score.prompt, { size: 9.5, color: COLOR.ink })
  }

  r.heading('Rubric Breakdown')
  for (const rs of score.rubricScores) {
    r.scoreBar(rs.dimension, rs.score, rs.maxScore, DIMENSION_COLOR[rs.dimension] ?? COLOR.slate)
  }
  for (const rs of score.rubricScores) {
    r.ensureSpace(10)
    r.doc.setFont('helvetica', 'bold')
    r.doc.setFontSize(8.8)
    r.doc.setTextColor(...(DIMENSION_COLOR[rs.dimension] ?? COLOR.slate))
    r.doc.text(rs.dimension, MARGIN, r.y)
    r.y += 4
    r.paragraph(rs.feedback, { size: 8.8 })
  }

  r.heading('Overall Feedback')
  r.paragraph(score.overallFeedback, { size: 9.7, color: COLOR.ink })

  r.labeledCard('Strengths', score.strengths, COLOR.excellent)
  r.labeledCard('Areas to Improve', score.weaknesses, COLOR.poor)
  r.labeledCard('Suggestions', score.suggestions, COLOR.primary)

  // ── Integrity check ─────────────────────────────────────
  if (score.aiDetection || score.originality) {
    const sevColor = score.aiDetection
      ? score.aiDetection.likelihood >= 80
        ? COLOR.poor
        : score.aiDetection.likelihood >= 60
          ? COLOR.average
          : COLOR.excellent
      : COLOR.teal
    const disclaimer = 'AI-detection is a probabilistic estimate, not proof of authorship. Originality is checked only against this student\u2019s own past submissions.'
    const innerW = CONTENT_W - 12

    r.doc.setFont('helvetica', 'normal')
    r.doc.setFontSize(8.6)
    const explanationLines: string[] = score.aiDetection ? r.doc.splitTextToSize(score.aiDetection.explanation, innerW) : []
    const originalityLines: string[] = score.originality ? r.doc.splitTextToSize(score.originality.note, innerW) : []
    r.doc.setFontSize(7.6)
    const disclaimerLines: string[] = r.doc.splitTextToSize(disclaimer, innerW)

    let innerH = 0
    if (score.aiDetection) innerH += 3.2 + 6.5 + explanationLines.length * 4.2 + 2
    if (score.originality) innerH += 4.6 + originalityLines.length * 4.2 + 2
    innerH += disclaimerLines.length * 3.8 + 2

    r.ensureSpace(innerH + 24)
    r.heading('Integrity Check', { accent: COLOR.teal })
    r.card(sevColor, innerH, () => {
      if (score.aiDetection) {
        r.doc.setFont('helvetica', 'bold')
        r.doc.setFontSize(9.5)
        r.doc.setTextColor(...COLOR.ink)
        r.doc.text(`AI-generated text likelihood: ${score.aiDetection.likelihood}%`, MARGIN + 3, r.y)
        r.doc.setFont('helvetica', 'normal')
        r.doc.setTextColor(...sevColor)
        r.doc.text(score.aiDetection.verdict, PAGE_W - MARGIN - 3, r.y, { align: 'right' })
        r.y += 3.2
        const trackW = CONTENT_W - 6
        r.doc.setFillColor(255, 255, 255)
        r.doc.roundedRect(MARGIN + 3, r.y, trackW, 2.6, 1.3, 1.3, 'F')
        r.doc.setFillColor(...sevColor)
        r.doc.roundedRect(MARGIN + 3, r.y, Math.max((score.aiDetection.likelihood / 100) * trackW, 2.6), 2.6, 1.3, 1.3, 'F')
        r.y += 6.5
        r.doc.setFont('helvetica', 'normal')
        r.doc.setFontSize(8.6)
        r.doc.setTextColor(...COLOR.muted)
        for (const line of explanationLines) {
          r.doc.text(line, MARGIN + 3, r.y)
          r.y += 4.2
        }
        r.y += 2
      }
      if (score.originality) {
        r.doc.setFont('helvetica', 'bold')
        r.doc.setFontSize(9.5)
        r.doc.setTextColor(...COLOR.ink)
        r.doc.text(`Originality vs. past essays: ${score.originality.score}/100`, MARGIN + 3, r.y)
        r.y += 4.6
        r.doc.setFont('helvetica', 'normal')
        r.doc.setFontSize(8.6)
        r.doc.setTextColor(...COLOR.muted)
        for (const line of originalityLines) {
          r.doc.text(line, MARGIN + 3, r.y)
          r.y += 4.2
        }
        r.y += 2
      }
      r.doc.setFont('helvetica', 'italic')
      r.doc.setFontSize(7.6)
      r.doc.setTextColor(...COLOR.muted)
      for (const line of disclaimerLines) {
        r.doc.text(line, MARGIN + 3, r.y)
        r.y += 3.8
      }
    })
  }

  // ── Grammar issues ──────────────────────────────────────
  if (score.grammarIssues && score.grammarIssues.length > 0) {
    r.heading('Flagged Grammar & Style Issues', { accent: COLOR.purple })
    for (const g of score.grammarIssues) {
      const typeColor = GRAMMAR_TYPE_COLOR[g.type] ?? COLOR.slate
      const excerptText = `\u201C${g.excerpt}\u201D`
      const bodyText = g.replacement ? g.issue : `${g.issue}${g.suggestion ? ' ' + g.suggestion : ''}`

      r.doc.setFont('helvetica', 'italic')
      r.doc.setFontSize(9.2)
      const excerptLines: string[] = r.doc.splitTextToSize(excerptText, CONTENT_W - 8)
      r.doc.setFont('helvetica', 'normal')
      r.doc.setFontSize(8.7)
      const bodyLines: string[] = r.doc.splitTextToSize(bodyText, CONTENT_W - 8)
      r.doc.setFont('courier', 'normal')
      r.doc.setFontSize(8.4)
      const fixLines: string[] = g.replacement ? r.doc.splitTextToSize(`Fix: ${g.replacement}`, CONTENT_W - 8) : []

      const totalH = 6 + excerptLines.length * 4.2 + bodyLines.length * 4 + fixLines.length * 4 + 5
      r.ensureSpace(totalH)
      const top = r.y

      r.doc.setFont('helvetica', 'bold')
      r.doc.setFontSize(7.2)
      const chipW = r.doc.getTextWidth(g.type.toUpperCase()) + 4.4
      r.doc.setFillColor(...typeColor)
      r.doc.roundedRect(MARGIN + 3, r.y - 3.2, chipW, 4.4, 1.1, 1.1, 'F')
      r.doc.setTextColor(...COLOR.white)
      r.doc.text(g.type.toUpperCase(), MARGIN + 3 + chipW / 2, r.y, { align: 'center' })
      r.y += 5.4

      r.doc.setFont('helvetica', 'italic')
      r.doc.setFontSize(9.2)
      r.doc.setTextColor(...COLOR.ink)
      for (const line of excerptLines) {
        r.doc.text(line, MARGIN + 3, r.y)
        r.y += 4.2
      }

      r.doc.setFont('helvetica', 'normal')
      r.doc.setFontSize(8.7)
      r.doc.setTextColor(...COLOR.muted)
      for (const line of bodyLines) {
        r.doc.text(line, MARGIN + 3, r.y)
        r.y += 4
      }

      if (fixLines.length) {
        r.doc.setFont('courier', 'normal')
        r.doc.setFontSize(8.4)
        r.doc.setTextColor(...COLOR.excellent)
        for (const line of fixLines) {
          r.doc.text(line, MARGIN + 3, r.y)
          r.y += 4
        }
      }

      const bottom = r.y + 1.5
      r.doc.setFillColor(...typeColor)
      r.doc.roundedRect(MARGIN, top - 4.4, 1.1, bottom - (top - 4.4), 0.5, 0.5, 'F')
      r.y = bottom + 3
    }
  }

  r.finalizeFooters(BRAND_FOOTER)

  const filename = `PasaBoost-Score-${score.examType}-${new Date(score.createdAt).toISOString().slice(0, 10)}.pdf`
  r.doc.save(filename)
}

// ============================================================
// Essay portfolio (multi-essay compilation)
// Cover page (student, date range, average/best score, per-
// dimension averages, essay list) followed by one condensed
// section per essay. Meant for sharing with a tutor/parent or
// offline review — not as detailed as exportScoreToPDF above.
// ============================================================
export async function exportPortfolioToPDF(scores: EssayScore[], studentName?: string) {
  if (scores.length === 0) return

  const logoBytes = await loadLogoBytes()
  const r = new PdfReport(logoBytes)

  // Oldest first, so the portfolio reads as a chronological progression.
  const ordered = [...scores].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const avgScore = Math.round(ordered.reduce((s, e) => s + e.totalScore, 0) / ordered.length)
  const bestScore = Math.max(...ordered.map((s) => s.totalScore))
  const dateRange = ordered.length > 1
    ? `${formatDate(ordered[0].createdAt)} \u2013 ${formatDate(ordered[ordered.length - 1].createdAt)}`
    : formatDate(ordered[0].createdAt)

  const dims: ScoreDimension[] = ['Content', 'Organization', 'Grammar', 'Coherence', 'Argument']
  const dimensionAverages = dims.map((dim) => {
    const vals = ordered
      .map((s) => s.rubricScores.find((rs) => rs.dimension === dim)?.score)
      .filter((v): v is number => v != null)
    return { dimension: dim, average: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null }
  })

  r.drawHeader({
    eyebrow: 'PasaBoost',
    title: 'Essay Portfolio',
    metaLeft: studentName ? `${studentName} \u00B7 ${dateRange}` : dateRange,
    scoreText: `${avgScore}/100`,
    bandText: 'Average',
    bandCol: bandColor(avgScore),
  })

  // ── Summary stat row ─────────────────────────────────────
  r.heading('Summary', { size: 12.5 })
  const stats = [
    { label: 'Essays Scored', value: String(ordered.length) },
    { label: 'Average Score', value: `${avgScore}/100` },
    { label: 'Best Score', value: `${bestScore}/100` },
  ]
  const colW = CONTENT_W / 3
  const statTop = r.y
  stats.forEach((s, i) => {
    const x = MARGIN + i * colW
    r.doc.setFillColor(...COLOR.cardBg)
    r.doc.roundedRect(x, statTop, colW - 4, 18, 2, 2, 'F')
    r.doc.setFont('helvetica', 'bold')
    r.doc.setFontSize(15)
    r.doc.setTextColor(...COLOR.navy)
    r.doc.text(s.value, x + (colW - 4) / 2, statTop + 9, { align: 'center' })
    r.doc.setFont('helvetica', 'normal')
    r.doc.setFontSize(7.6)
    r.doc.setTextColor(...COLOR.muted)
    r.doc.text(s.label, x + (colW - 4) / 2, statTop + 14.5, { align: 'center' })
  })
  r.y = statTop + 24

  r.heading('Average by Dimension', { size: 12 })
  for (const item of dimensionAverages) {
    if (item.average == null) continue
    r.scoreBar(item.dimension, item.average, 20, DIMENSION_COLOR[item.dimension] ?? COLOR.slate)
  }

  r.heading('Essays Included', { size: 12 })
  for (const s of ordered) {
    r.ensureSpace(7.5)
    const rowY = r.y
    r.doc.setFont('helvetica', 'normal')
    r.doc.setFontSize(9.3)
    r.doc.setTextColor(...COLOR.ink)
    r.doc.text(formatDate(s.createdAt), MARGIN, rowY)
    r.chip(s.examType, MARGIN + 26, rowY, EXAM_COLOR[s.examType] ?? COLOR.slate)
    r.doc.setFont('helvetica', 'bold')
    r.doc.setTextColor(...bandColor(s.totalScore))
    r.doc.text(`${s.totalScore}/100`, PAGE_W - MARGIN, rowY, { align: 'right' })
    r.y += 6.4
  }

  // ── One condensed section per essay ─────────────────────
  for (const score of ordered) {
    r.doc.addPage()
    r.drawHeader({
      title: `${score.examType} \u00B7 ${formatDate(score.createdAt)}`,
      metaLeft: `${score.totalScore}/100 \u2014 ${score.estimatedBand}`,
    }, false)

    if (score.prompt) {
      r.heading('Prompt', { size: 11 })
      r.paragraph(score.prompt, { size: 9.3 })
    }

    r.heading('Rubric Breakdown', { size: 11 })
    for (const rs of score.rubricScores) {
      r.scoreBar(rs.dimension, rs.score, rs.maxScore, DIMENSION_COLOR[rs.dimension] ?? COLOR.slate)
    }

    r.heading('Overall Feedback', { size: 11 })
    r.paragraph(score.overallFeedback, { size: 9.3, color: COLOR.ink })
  }

  r.finalizeFooters(BRAND_FOOTER)

  const filename = `PasaBoost-Portfolio-${new Date().toISOString().slice(0, 10)}.pdf`
  r.doc.save(filename)
}
