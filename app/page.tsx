'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, CheckCircle, Brain, TrendingUp, BookOpen, PenLine, BarChart3, Users,
} from 'lucide-react'
import LogoMark from '@/components/ui/LogoMark'

const FEATURES = [
  { icon: Brain, title: 'AI-powered scoring', desc: 'Get instant scores on Content, Organization, Grammar, Coherence, and Argument using our Philippine college rubric.' },
  { icon: PenLine, title: 'Smart essay editor', desc: 'Write with auto-saving drafts, word count tracking, and daily writing prompts tailored for UPCAT, ACET, DCAT, and USTET.' },
  { icon: TrendingUp, title: 'Paragraph rewrites', desc: 'See AI-rewritten versions of your weakest paragraphs side-by-side with detailed explanations of every improvement.' },
  { icon: BarChart3, title: 'Progress analytics', desc: 'Track score progression, writing streaks, grammar improvement, and vocabulary diversity over your 8-week preparation.' },
  { icon: BookOpen, title: 'Daily prompts', desc: 'Practice with Philippine-focused prompts on social issues, science, and culture — new prompts every day.' },
  { icon: Users, title: 'Peer leaderboard', desc: 'Optional anonymous leaderboard to see how you rank against other exam takers and stay motivated.' },
]

const EXAMS = [
  { name: 'UPCAT', school: 'University of the Philippines' },
  { name: 'ACET', school: 'Ateneo de Manila University' },
  { name: 'DCAT', school: 'De La Salle University' },
  { name: 'USTET', school: 'University of Santo Tomas' },
]

const STATS = [
  { value: '5', label: 'Scoring dimensions' },
  { value: '20+', label: 'Writing prompts' },
  { value: '8', label: 'Week study period' },
  { value: '4', label: 'Exams covered' },
]

const RUBRIC = [
  { dim: 'Content', pct: 20 },
  { dim: 'Organization', pct: 20 },
  { dim: 'Grammar & Mechanics', pct: 20 },
  { dim: 'Coherence & Flow', pct: 20 },
  { dim: 'Argument & Reasoning', pct: 20 },
]

const BANDS = [
  { band: 'Excellent', range: '90–100', tone: 'excellent' },
  { band: 'Proficient', range: '75–89', tone: 'good' },
  { band: 'Developing', range: '60–74', tone: 'average' },
  { band: 'Beginning', range: '45–59', tone: 'poor' },
]

const bandClasses: Record<string, string> = {
  excellent: 'border-l-2 border-l-[hsl(var(--score-excellent))]',
  good: 'border-l-2 border-l-[hsl(var(--score-good))]',
  average: 'border-l-2 border-l-[hsl(var(--score-average))]',
  poor: 'border-l-2 border-l-[hsl(var(--score-poor))]',
}
const bandText: Record<string, string> = {
  excellent: 'text-[hsl(var(--score-excellent))]',
  good: 'text-[hsl(var(--score-good))]',
  average: 'text-[hsl(var(--score-average))]',
  poor: 'text-[hsl(var(--score-poor))]',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="brand-mark text-lg">PasaBoost</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-rule-pattern bg-rule opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="eyebrow mb-5">For UPCAT · ACET · DCAT · USTET reviewees</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold text-foreground tracking-tight mb-6 text-balance">
              Write the essay that gets you in.{' '}
              <span className="text-primary">Pasa na.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              PasaBoost scores every essay you write against the same rubric college reviewers
              use, then shows you exactly what to fix — line by line, week by week.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="glow-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-all">
                Start practicing free
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-card border border-border text-foreground font-semibold rounded-md hover:bg-accent transition-colors">
                Sign in
              </Link>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap justify-center gap-2.5 mt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {EXAMS.map((exam) => (
              <div key={exam.name} className="flex items-center gap-2 px-3.5 py-1.5 bg-card border border-border rounded-full text-sm">
                <span className="font-semibold text-foreground">{exam.name}</span>
                <span className="text-muted-foreground hidden sm:inline">— {exam.school}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-14 border-y border-border bg-muted/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} className="text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
                <div className="text-3xl font-display font-semibold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <p className="eyebrow mb-3">What you get</p>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-4">Everything you need to score higher</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              PasaBoost combines AI feedback, progress tracking, and practice prompts into one focused tool for college entrance exam preparation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
              >
                <feature.icon size={20} className="text-primary mb-4" strokeWidth={1.75} />
                <h3 className="font-display font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="eyebrow mb-3">The rubric</p>
              <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-5">Scored on the official rubric</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your essay is evaluated across the same five dimensions assessed in Philippine college
                entrance exams. Each dimension is scored out of 20, for a maximum of 100 points.
              </p>
              <div className="space-y-3.5">
                {RUBRIC.map((item) => (
                  <div key={item.dim} className="flex items-center gap-4">
                    <div className="w-44 text-sm font-medium text-foreground flex-shrink-0">{item.dim}</div>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} whileInView={{ width: `${item.pct}%` }} transition={{ duration: 0.7 }} viewport={{ once: true }} />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-10 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {BANDS.map((b) => (
                <div key={b.band} className={`p-4 rounded-lg bg-card border border-border ${bandClasses[b.tone]}`}>
                  <div className={`text-2xl font-display font-semibold mb-1 ${bandText[b.tone]}`}>{b.range}</div>
                  <div className="font-medium text-foreground text-sm">{b.band}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-5">Your dream school is within reach.</h2>
            <p className="text-muted-foreground text-lg mb-9 leading-relaxed">
              Join students using AI feedback to consistently improve their essay scores. Start practicing today — it&apos;s completely free.
            </p>
            <div className="flex justify-center mb-8">
              <Link href="/register" className="glow-primary inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-all">
                Create free account
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
              {['No credit card required', 'Free to use', 'UPCAT / ACET / DCAT / USTET ready'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>PasaBoost — Thesis Project: &ldquo;An AI-Powered Essay Coaching System for Enhancing College Entrance Examination Writing Performance&rdquo;</p>
          <p className="mt-1">Built for Filipino students. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
