import './globals.css'
import './print-reports.css'
import './design-system.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AlRabat RPF - Masters of Foundation Construction System',
  description: 'Masters of Foundation Construction - AlRabat RPF',
}

// Disable caching for dynamic content
export const dynamic = 'force-dynamic'
export const revalidate = 0


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className}`}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
