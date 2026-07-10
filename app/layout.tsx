import type { Metadata } from 'next'
import { IBM_Plex_Sans, Fraunces, Caveat } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const hand = Caveat({
  subsets: ['latin'],
  variable: '--font-hand',
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PasaBoost – AI Essay Coach for Philippine College Exams',
  description: 'AI-powered essay coaching for UPCAT, ACET, DCAT, and USTET preparation.',
  keywords: ['UPCAT', 'ACET', 'DCAT', 'USTET', 'essay coaching', 'college entrance exam', 'Philippines', 'AI'],
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable} ${hand.variable} font-sans`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
