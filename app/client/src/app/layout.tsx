import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import type { ReactNode } from 'react'
import { AppProviders } from '@/providers/AppProviders'
import './globals.css'

const manrope = Manrope({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  applicationName: 'Oputech Sales',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Oputech Sales',
  },
  description: 'Mobile-first point of sale and business operations.',
  formatDetection: { telephone: false },
  title: {
    default: 'Oputech Sales',
    template: '%s · Oputech Sales',
  },
}

export const viewport: Viewport = {
  themeColor: '#17434d',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.className} ${manrope.variable}`}>
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
