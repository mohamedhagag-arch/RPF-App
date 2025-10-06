import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rabat MVP - Project Management System',
  description: 'Project Management System - Rabat MVP',
}

// Disable caching for dynamic content
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Add connection headers to prevent disconnection
export const headers = async () => {
  return {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=30, max=1000',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

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
