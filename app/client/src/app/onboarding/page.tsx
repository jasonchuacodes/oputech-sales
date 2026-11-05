import type { Metadata } from 'next'
import OnboardingPage from '@/features/onboarding/OnboardingPage'

export const metadata: Metadata = { title: 'Set up your workspace' }

export default function OnboardingRoute() {
  return <OnboardingPage />
}
