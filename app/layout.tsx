import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PasaBoost – AI Essay Coach for Philippine College Exams',
  description: 'AI-powered essay coaching for UPCAT, ACET, DCAT, and USTET preparation.',
  keywords: ['UPCAT', 'ACET', 'DCAT', 'USTET', 'essay coaching', 'college entrance exam', 'Philippines', 'AI'],
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'PasaBoost – AI Essay Coach for Philippine College Exams',
    description: 'Score, feedback, and rewrites for UPCAT, ACET, DCAT, and USTET essays.',
    type: 'website',
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary',
    title: 'PasaBoost – AI Essay Coach',
    description: 'Score, feedback, and rewrites for Philippine college entrance exam essays.',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(220, 25%, 98%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(224, 45%, 6%)' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pasaboost-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${grotesk.variable} font-sans`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
