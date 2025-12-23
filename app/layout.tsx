import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BookDNA - Natural Language Book Search',
  description: 'Discover books using natural language. Search by mood, themes, pacing, and writing style with advanced semantic search.',
  keywords: ['books', 'book search', 'natural language', 'semantic search', 'book discovery', 'book recommendations'],
  authors: [{ name: 'BookDNA' }],
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

