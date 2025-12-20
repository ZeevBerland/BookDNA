import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BookDNA - Natural Language Book Search',
  description: 'Discover books using natural language powered by AI',
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

