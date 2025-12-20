'use client'

import { useState, KeyboardEvent } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

const EXAMPLE_QUERIES = [
  "Cozy fantasy with emotional healing and slow pacing",
  "A practical leadership book without storytelling fluff",
  "Dark romance with sharp dialogue and a tragic ending",
  "Hopeful sci-fi about humanity and AI",
  "Historical fiction set in ancient Rome with strong female lead"
]

export default function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showExamples, setShowExamples] = useState(false)

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
    setShowExamples(false)
    onSearch(example)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowExamples(true)}
          onBlur={() => setTimeout(() => setShowExamples(false), 200)}
          placeholder="Describe the book you're looking for..."
          className="w-full px-4 sm:px-6 py-4 pr-12 sm:pr-14 rounded-2xl bg-white border-2 border-brown-medium/20 focus:border-copper focus:outline-none transition-all resize-none shadow-soft text-base sm:text-lg"
          rows={2}
          disabled={isLoading}
        />
        
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-xl bg-copper text-white hover:bg-copper/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          aria-label="Search"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
          ) : (
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      </div>

      {/* Example queries dropdown */}
      {showExamples && !isLoading && (
        <div className="mt-3 p-4 bg-white rounded-xl shadow-card border border-brown-medium/10">
          <p className="text-sm font-medium text-brown-medium mb-3">Try these examples:</p>
          <div className="space-y-2">
            {EXAMPLE_QUERIES.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-brown-medium/5 transition-colors text-sm text-brown-dark"
              >
                <span className="italic">"{example}"</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

