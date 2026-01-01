import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import PermissionsPolicy from '@/components/PermissionsPolicy'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ISSO Donation Kiosk - Admin Portal',
  description: 'Admin portal for ISSO Donation Kiosk System',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PermissionsPolicy />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
