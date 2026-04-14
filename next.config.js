const enablePwaInDev = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === 'true'

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' && !enablePwaInDev,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-static', expiration: { maxEntries: 200, maxAgeSeconds: 31536000 } },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-image', expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
    },
    {
      // All app pages — serve from cache instantly, revalidate in background
      urlPattern: ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'),
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'pages', expiration: { maxEntries: 32, maxAgeSeconds: 86400 } },
    },
    {
      // Supabase API calls — network only, fail gracefully offline (sync handles retry)
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkOnly',
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
