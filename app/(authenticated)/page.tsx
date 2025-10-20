import { redirect } from 'next/navigation'

export default function AuthenticatedPage() {
  // Redirect to dashboard as the default authenticated page
  redirect('/dashboard')
}
