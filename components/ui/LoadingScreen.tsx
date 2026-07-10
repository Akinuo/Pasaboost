'use client'

import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center shadow-lg">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M15 5v20M8 6.5c2.5 -1 4.5 -1 7 0v19c-2.5 -1 -4.5 -1 -7 0z" stroke="hsl(var(--primary-foreground))" strokeWidth="1.3" fill="none" opacity="0.7" />
            </svg>
          </div>
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-redpen"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-lg font-display font-semibold text-foreground">PasaBoost</span>
          <span className="text-sm text-muted-foreground">Loading your workspace…</span>
        </motion.div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-redpen"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
