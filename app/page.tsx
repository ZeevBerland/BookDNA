'use client'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import BookGrid from '@/components/BookGrid'
import { Book } from '@/lib/types'
import { BookOpen } from 'lucide-react'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit: 20 }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      setBooks(data.results || [])
    } catch (err) {
      setError('Failed to search. Please try again.')
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="absolute top-0 right-0 p-6 z-10">
        <a
          href="/submit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-copper text-copper hover:bg-copper hover:text-white transition-colors font-medium"
        >
          <BookOpen className="w-4 h-4" />
          Submit Your Book
        </a>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-cream to-white">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo/Title */}
          <div className="mb-6">
            <BookOpen className="w-16 h-16 text-copper mx-auto mb-4" />
            <h1 className="font-serif text-6xl md:text-7xl font-bold text-brown-dark mb-2">
              <span className="italic">Book</span>DNA
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-copper font-medium mb-2">
            Natural Language Book Search
          </p>
          <p className="text-lg text-brown-medium mb-12 max-w-2xl mx-auto">
            Powered by AI
          </p>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {/* Info text */}
          <p className="mt-6 text-sm text-brown-medium/70 max-w-2xl mx-auto">
            Describe the book you're looking for using natural language.
            Tell us about the mood, themes, pacing, or style you prefer.
          </p>
        </div>
      </section>

      {/* Results Section */}
      {hasSearched && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {error ? (
              <div className="text-center py-12">
                <div className="inline-block px-6 py-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {error}
                </div>
              </div>
            ) : (
              <>
                {!isLoading && books.length > 0 && (
                  <div className="mb-8">
                    <h2 className="font-serif text-3xl text-brown-dark mb-2">
                      Search Results
                    </h2>
                    <p className="text-brown-medium">
                      Found {books.length} book{books.length !== 1 ? 's' : ''} matching your query
                    </p>
                  </div>
                )}
                
                <BookGrid books={books} isLoading={isLoading} />
              </>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-4 bg-cream mt-20">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-brown-medium text-sm">
            <span className="font-serif italic">Book</span>DNA - ML 2 Unsupervised Learning (2025)
          </p>
          <p className="text-brown-medium/70 text-xs mt-2">
            Group 4 • Dr. Gilli Shama • Reichman University
          </p>
        </div>
      </footer>
    </main>
  )
}

