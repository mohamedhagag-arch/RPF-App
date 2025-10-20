import { redirect } from 'next/navigation'

export default function AuthenticatedPage() {
  // Server-side redirect to dashboard
  redirect('/dashboard')
}
