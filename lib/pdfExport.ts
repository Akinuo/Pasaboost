// ============================================================
// PDF Export — Essay Score Report
// Builds a clean, text-based PDF client-side with jsPDF. No
// canvas/screenshot step needed, so it stays crisp and small.
// ============================================================

import { jsPDF } from 'jspdf'
import type { EssayScore } from '@/types'
import { formatDate } from '@/lib/utils'

const MARGIN = 15
const PAGE_WIDTH = 210 // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export function exportScoreToPDF(score: EssayScore) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const ensureSpace = (needed: number) => {
    if (y + needed > 285) {
      doc.addPage()
      y = MARGIN
    }
  }

  const heading = (text: string, size = 14) => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(20, 20, 30)
    doc.text(text, MARGIN, y)
    y += size / 2.6 + 2
  }

  const paragraph = (text: string, size = 10) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(50, 50, 60)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
    for (const line of lines) {
      ensureSpace(6)
      doc.text(line, MARGIN, y)
      y += 5
    }
    y += 2
  }

  const bulletList = (items: string[]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 60)
    for (const item of items) {
      const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_WIDTH - 3)
      for (const line of lines) {
        ensureSpace(6)
        doc.text(line, MARGIN + 2, y)
        y += 5
      }
    }
    y += 2
  }

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, PAGE_WIDTH, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('PasaBoost — Essay Score Report', MARGIN, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(210, 220, 240)
  doc.text(`${score.examType} · ${new Date(score.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, MARGIN, 23)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(`${score.totalScore}/100`, PAGE_WIDTH - MARGIN, 18, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(score.estimatedBand, PAGE_WIDTH - MARGIN, 25, { align: 'right' })

  y = 42

  if (score.prompt) {
    heading('Essay Prompt', 11)
    paragraph(score.prompt)
  }

  // ── Rubric scores ───────────────────────────────────────
  heading('Rubric Breakdown')
  for (const r of score.rubricScores) {
    ensureSpace(7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 40)
    doc.text(`${r.dimension}: ${r.score}/20`, MARGIN, y)
    y += 5
    paragraph(r.feedback, 9)
  }

  // ── Overall feedback ────────────────────────────────────
  heading('Overall Feedback')
  paragraph(score.overallFeedback)

  if (score.strengths.length > 0) {
    heading('Strengths', 12)
    bulletList(score.strengths)
  }
  if (score.weaknesses.length > 0) {
    heading('Areas to Improve', 12)
    bulletList(score.weaknesses)
  }
  if (score.suggestions.length > 0) {
    heading('Suggestions', 12)
    bulletList(score.suggestions)
  }

  // ── Integrity check ─────────────────────────────────────
  if (score.aiDetection || score.originality) {
    heading('Integrity Check')
    if (score.aiDetection) {
      paragraph(`AI-generated text likelihood: ${score.aiDetection.likelihood}% — ${score.aiDetection.verdict}`)
      paragraph(score.aiDetection.explanation, 9)
    }
    if (score.originality) {
      paragraph(`Originality vs. past essays: ${score.originality.score}/100 — ${score.originality.note}`)
    }
    paragraph('Note: AI-detection is a probabilistic estimate, not proof of authorship. Originality is checked only against this student\'s own past submissions.', 8)
  }

  // ── Grammar issues ──────────────────────────────────────
  if (score.grammarIssues && score.grammarIssues.length > 0) {
    heading('Flagged Grammar & Style Issues')

    for (const g of score.grammarIssues) {
      const titleText = `[${g.type}] "${g.excerpt}"`
      const bodyText = g.replacement
        ? `${g.issue}${g.issue ? ' — ' : ''}Suggested fix: "${g.replacement}"`
        : g.suggestion
          ? `${g.issue}${g.issue ? ' — ' : ''}${g.suggestion}`
          : g.issue

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const titleLines = doc.splitTextToSize(titleText, CONTENT_WIDTH)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const bodyLines = doc.splitTextToSize(bodyText, CONTENT_WIDTH)

      // Reserve space for the whole item up front so it doesn't get
      // split awkwardly across a page break mid-way through.
      ensureSpace(titleLines.length * 4.5 + bodyLines.length * 4.5 + 5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(180, 100, 20)
      for (const line of titleLines) {
        doc.text(line, MARGIN, y)
        y += 4.5
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 60)
      for (const line of bodyLines) {
        doc.text(line, MARGIN, y)
        y += 4.5
      }

      y += 3.5 // breathing room between issues
    }
  }

  const filename = `PasaBoost-Score-${score.examType}-${new Date(score.createdAt).toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}

// ============================================================
// PDF Export — Essay Portfolio
// Compiles a set of scored essays into a single printable document:
// a summary cover page (student, date range, average/best score,
// per-dimension averages) followed by one condensed entry per essay
// (prompt, score, band, rubric breakdown, overall feedback). Meant
// for sharing with a tutor/parent or offline review — not as detailed
// as the single-essay report from exportScoreToPDF above.
// ============================================================

export function exportPortfolioToPDF(scores: EssayScore[], studentName?: string) {
  if (scores.length === 0) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const ensureSpace = (needed: number) => {
    if (y + needed > 285) {
      doc.addPage()
      y = MARGIN
    }
  }

  const heading = (text: string, size = 14) => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(20, 20, 30)
    doc.text(text, MARGIN, y)
    y += size / 2.6 + 2
  }

  const paragraph = (text: string, size = 10) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(50, 50, 60)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
    for (const line of lines) {
      ensureSpace(6)
      doc.text(line, MARGIN, y)
      y += 5
    }
    y += 2
  }

  // Oldest first, so the portfolio reads as a chronological progression.
  const ordered = [...scores].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const avgScore = Math.round(ordered.reduce((s, e) => s + e.totalScore, 0) / ordered.length)
  const bestScore = Math.max(...ordered.map((s) => s.totalScore))
  const dateRange = ordered.length > 1
    ? `${formatDate(ordered[0].createdAt)} – ${formatDate(ordered[ordered.length - 1].createdAt)}`
    : formatDate(ordered[0].createdAt)

  const dimensionAverages = (['Content', 'Organization', 'Grammar', 'Coherence', 'Argument'] as const).map((dim) => {
    const vals = ordered.map((s) => s.rubricScores.find((r) => r.dimension === dim)?.score).filter((v): v is number => v != null)
    return { dimension: dim, average: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null }
  })

  // ── Cover page ──────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, PAGE_WIDTH, 32, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('PasaBoost — Essay Portfolio', MARGIN, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(210, 220, 240)
  doc.text(studentName ? `${studentName} · ${dateRange}` : dateRange, MARGIN, 23)

  y = 42

  heading('Summary')
  paragraph(`${ordered.length} scored essay${ordered.length > 1 ? 's' : ''} · Average score ${avgScore}/100 · Best score ${bestScore}/100`)

  heading('Average by Dimension', 12)
  for (const item of dimensionAverages) {
    if (item.average == null) continue
    ensureSpace(6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 60)
    doc.text(`•  ${item.dimension}: ${item.average}/20`, MARGIN + 2, y)
    y += 5
  }
  y += 2

  heading('Essays Included', 12)
  for (const s of ordered) {
    ensureSpace(6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(50, 50, 60)
    const label = `${formatDate(s.createdAt)}  ·  ${s.examType}  ·  ${s.totalScore}/100`
    doc.text(label, MARGIN, y)
    y += 5
  }

  // ── One condensed section per essay ─────────────────────
  for (const score of ordered) {
    doc.addPage()
    y = MARGIN

    heading(`${score.examType} · ${formatDate(score.createdAt)}`, 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(20, 20, 30)
    doc.text(`${score.totalScore}/100 — ${score.estimatedBand}`, MARGIN, y)
    y += 8

    if (score.prompt) {
      heading('Prompt', 11)
      paragraph(score.prompt, 9.5)
    }

    heading('Rubric Breakdown', 11)
    for (const r of score.rubricScores) {
      ensureSpace(5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(30, 30, 40)
      doc.text(`${r.dimension}: ${r.score}/20`, MARGIN, y)
      y += 5
    }
    y += 2

    heading('Overall Feedback', 11)
    paragraph(score.overallFeedback, 9.5)
  }

  const filename = `PasaBoost-Portfolio-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
