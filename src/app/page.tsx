'use client'

import { useRouter } from 'next/navigation'
import { LoginScreen } from '@/components/screens/LoginScreen'
import { startSession } from '@/lib/session'

export default function HomePage() {
  const router = useRouter()

  return (
    <LoginScreen
      onLogin={() => {
        startSession()
        router.push('/dashboard')
      }}
    />
  )
}
