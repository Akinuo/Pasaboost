'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative px-4">
      <div className="absolute inset-0 bg-rule-pattern bg-rule opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <motion.div className="text-center relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-8xl font-display font-semibold text-primary/15 mb-4">404</div>
        <h1 className="text-2xl font-display font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium bg-background hover:bg-accent transition-colors">
            <ArrowLeft size={15} />
            Go Back
          </button>
          <Link href="/" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Home size={15} />
            Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
