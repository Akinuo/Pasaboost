// ============================================================
// PDF Export — Essay Score Report
// Builds a clean, text-based PDF client-side with jsPDF. No
// canvas/screenshot step needed, so it stays crisp and small.
// ============================================================

import { jsPDF } from 'jspdf'
import type { EssayScore } from '@/types'

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
      ensureSpace(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(180, 100, 20)
      doc.text(`[${g.type}] "${g.excerpt}"`, MARGIN, y)
      y += 4.5
      paragraph(`${g.issue} → ${g.suggestion}`, 9)
    }
  }

  const filename = `PasaBoost-Score-${score.examType}-${new Date(score.createdAt).toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
