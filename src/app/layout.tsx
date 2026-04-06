import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DevServiceWorkerReset } from '@/components/layout/DevServiceWorkerReset'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

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
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {process.env.NODE_ENV === 'development' ? <DevServiceWorkerReset /> : null}
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
