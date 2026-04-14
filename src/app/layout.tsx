import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { DevServiceWorkerReset } from '@/components/layout/DevServiceWorkerReset'
import { Toaster } from '@/components/ui/sonner'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Eleosgate POS',
  description: 'Point of Sale & Inventory for Eleosgate Pharmacy',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Eleosgate POS',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B5E20',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shouldResetDevSw =
    process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== 'true'

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} antialiased`}>
        {shouldResetDevSw ? <DevServiceWorkerReset /> : null}
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
