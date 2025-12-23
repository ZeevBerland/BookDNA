'use client'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import BookGrid from '@/components/BookGrid'
import FilterSidebar, { FilterState } from '@/components/FilterSidebar'
import { Book } from '@/lib/types'
import { BookOpen, SlidersHorizontal, X } from 'lucide-react'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Phase 2: Filter state
  const [filters, setFilters] = useState<FilterState>({
    genres: [],
    minYear: null,
    maxYear: null,
    minPages: null,
    maxPages: null,
    readingLevel: null,
    minRating: null
  })

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setCurrentQuery(query)

    try {
      // Phase 2: Include filter parameters in search
      const searchParams: any = { 
        query, 
        limit: 100,  // Increased limit for better filtering
      }
      
      // Add filters only if they're set
      if (filters.genres.length > 0) searchParams.genres = filters.genres
      if (filters.minYear) searchParams.min_year = filters.minYear
      if (filters.maxYear) searchParams.max_year = filters.maxYear
      if (filters.minPages) searchParams.min_pages = filters.minPages
      if (filters.maxPages) searchParams.max_pages = filters.maxPages
      if (filters.readingLevel) searchParams.reading_level = filters.readingLevel
      if (filters.minRating) searchParams.min_rating = filters.minRating
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
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

  // Re-run search when filters change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    // If user has already searched, re-run the search with new filters
    if (hasSearched && currentQuery) {
      handleSearch(currentQuery)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="absolute top-0 right-0 p-3 sm:p-6 z-10">
        <a
          href="/submit"
          className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg border-2 border-copper text-copper hover:bg-copper hover:text-white transition-colors font-medium text-sm sm:text-base"
        >
          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Submit Your Book</span>
          <span className="sm:hidden">Submit</span>
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

      {/* Results Section with Filters */}
      {hasSearched && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Filter Button */}
            {!error && (
              <div className="lg:hidden mb-4 flex justify-end">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-copper text-copper hover:bg-copper hover:text-white transition-colors font-medium"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {(filters.genres.length > 0 || filters.minRating) && (
                    <span className="bg-copper text-white px-2 py-0.5 rounded-full text-xs">
                      {filters.genres.length + (filters.minRating ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="flex gap-6 relative">
              {/* Desktop Sidebar */}
              {!error && (
                <aside className="hidden lg:block w-80 flex-shrink-0">
                  <div className="sticky top-4">
                    <FilterSidebar 
                      filters={filters} 
                      onFiltersChange={handleFiltersChange}
                    />
                  </div>
                </aside>
              )}

              {/* Mobile Drawer */}
              {showMobileFilters && !error && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  {/* Backdrop */}
                  <div 
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowMobileFilters(false)}
                  />
                  {/* Drawer */}
                  <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl">
                    <FilterSidebar 
                      filters={filters} 
                      onFiltersChange={handleFiltersChange}
                      onClose={() => setShowMobileFilters(false)}
                    />
                  </div>
                </div>
              )}

              {/* Results Content */}
              <div className="flex-1 min-w-0">
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
            </div>
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

