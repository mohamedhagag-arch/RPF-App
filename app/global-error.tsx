'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                margin: '0 auto 1rem',
                borderRadius: '9999px',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg
                  style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                Application Error
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '1rem'
              }}>
                A critical error occurred. Please reload the page.
              </p>
              
              {error.message && (
                <details style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '0.75rem',
                  borderRadius: '0.25rem',
                  marginBottom: '1rem',
                  textAlign: 'left'
                }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                    Error Details
                  </summary>
                  <pre style={{
                    marginTop: '0.5rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {error.message}
                  </pre>
                  {error.digest && (
                    <p style={{ marginTop: '0.5rem', color: '#9ca3af' }}>
                      Error ID: {error.digest}
                    </p>
                  )}
                </details>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={reset}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

