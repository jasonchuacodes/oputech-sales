import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oputech Sales',
    short_name: 'Opusales',
    description: 'Mobile-first point of sale and business operations.',
    start_url: '/login',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#17434d',
    orientation: 'any',
    icons: [
      { src: '/assets/brand/mark.png', sizes: '512x512', type: 'image/png' },
      { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/assets/brand/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
