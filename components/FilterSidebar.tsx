'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'

export interface FilterState {
  genres: string[]
  minYear: number | null
  maxYear: number | null
  minPages: number | null
  maxPages: number | null
  readingLevel: string | null
  minRating: number | null
}

interface FilterSidebarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClose?: () => void  // For mobile drawer
  className?: string
}

// Top 20 most common book genres
const POPULAR_GENRES = [
  'Fiction',
  'Non-fiction',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Fantasy',
  'Thriller',
  'Biography',
  'History',
  'Self-Help',
  'Business',
  'Young Adult',
  'Children',
  'Horror',
  'Poetry',
  'Memoir',
  'Cooking',
  'Travel',
  'Science',
  'Religion'
]

const READING_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
]

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1800
const MIN_PAGES = 0
const MAX_PAGES = 2000

export default function FilterSidebar({ filters, onFiltersChange, onClose, className = '' }: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    genres: true,
    year: false,
    pages: false,
    level: false,
    rating: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre]
    onFiltersChange({ ...filters, genres: newGenres })
  }

  const handleClearAll = () => {
    onFiltersChange({
      genres: [],
      minYear: null,
      maxYear: null,
      minPages: null,
      maxPages: null,
      readingLevel: null,
      minRating: null
    })
  }

  const hasActiveFilters = 
    filters.genres.length > 0 ||
    filters.minYear !== null ||
    filters.maxYear !== null ||
    filters.minPages !== null ||
    filters.maxPages !== null ||
    filters.readingLevel !== null ||
    filters.minRating !== null

  return (
    <div className={`bg-white border border-brown-light/30 rounded-lg shadow-card flex flex-col max-h-[calc(100vh-2rem)] ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-brown-light/30 flex items-center justify-between flex-shrink-0 bg-white rounded-t-lg z-10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-copper" />
          <h2 className="font-serif text-xl font-bold text-brown-dark">Filters</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="sm:hidden p-2 hover:bg-brown-light/10 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-brown-medium" />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Clear All Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-2 text-sm font-medium text-copper border-2 border-copper rounded-lg hover:bg-copper hover:text-white transition-colors"
          >
            Clear All Filters
          </button>
        )}

        {/* Genres Filter */}
        <div className="border-b border-brown-light/30 pb-4">
          <button
            onClick={() => toggleSection('genres')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="font-semibold text-brown-dark">Genres</h3>
            {expandedSections.genres ? (
              <ChevronUp className="w-4 h-4 text-brown-medium" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brown-medium" />
            )}
          </button>
          
          {expandedSections.genres && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {POPULAR_GENRES.map(genre => (
                <label key={genre} className="flex items-center gap-2 cursor-pointer hover:bg-brown-light/5 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(genre)}
                    onChange={() => handleGenreToggle(genre)}
                    className="w-4 h-4 text-copper border-brown-medium/30 rounded focus:ring-copper focus:ring-offset-0"
                  />
                  <span className="text-sm text-brown-dark">{genre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Year Range Filter */}
        <div className="border-b border-brown-light/30 pb-4">
          <button
            onClick={() => toggleSection('year')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="font-semibold text-brown-dark">Publication Year</h3>
            {expandedSections.year ? (
              <ChevronUp className="w-4 h-4 text-brown-medium" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brown-medium" />
            )}
          </button>
          
          {expandedSections.year && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brown-medium mb-1 block">From</label>
                <input
                  type="number"
                  min={MIN_YEAR}
                  max={CURRENT_YEAR}
                  value={filters.minYear || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    minYear: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder={`${MIN_YEAR}`}
                  className="w-full px-3 py-2 border border-brown-medium/30 rounded-lg focus:border-copper focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-brown-medium mb-1 block">To</label>
                <input
                  type="number"
                  min={MIN_YEAR}
                  max={CURRENT_YEAR}
                  value={filters.maxYear || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    maxYear: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder={`${CURRENT_YEAR}`}
                  className="w-full px-3 py-2 border border-brown-medium/30 rounded-lg focus:border-copper focus:outline-none text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Page Count Filter */}
        <div className="border-b border-brown-light/30 pb-4">
          <button
            onClick={() => toggleSection('pages')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="font-semibold text-brown-dark">Page Count</h3>
            {expandedSections.pages ? (
              <ChevronUp className="w-4 h-4 text-brown-medium" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brown-medium" />
            )}
          </button>
          
          {expandedSections.pages && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brown-medium mb-1 block">Minimum</label>
                <input
                  type="number"
                  min={MIN_PAGES}
                  max={MAX_PAGES}
                  value={filters.minPages || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    minPages: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-brown-medium/30 rounded-lg focus:border-copper focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-brown-medium mb-1 block">Maximum</label>
                <input
                  type="number"
                  min={MIN_PAGES}
                  max={MAX_PAGES}
                  value={filters.maxPages || ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    maxPages: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="2000"
                  className="w-full px-3 py-2 border border-brown-medium/30 rounded-lg focus:border-copper focus:outline-none text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Reading Level Filter */}
        <div className="border-b border-brown-light/30 pb-4">
          <button
            onClick={() => toggleSection('level')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="font-semibold text-brown-dark">Reading Level</h3>
            {expandedSections.level ? (
              <ChevronUp className="w-4 h-4 text-brown-medium" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brown-medium" />
            )}
          </button>
          
          {expandedSections.level && (
            <select
              value={filters.readingLevel || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                readingLevel: e.target.value || null 
              })}
              className="w-full px-3 py-2 border border-brown-medium/30 rounded-lg focus:border-copper focus:outline-none text-sm"
            >
              {READING_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Rating Filter */}
        <div className="pb-4">
          <button
            onClick={() => toggleSection('rating')}
            className="w-full flex items-center justify-between text-left mb-3"
          >
            <h3 className="font-semibold text-brown-dark">Minimum Rating</h3>
            {expandedSections.rating ? (
              <ChevronUp className="w-4 h-4 text-brown-medium" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brown-medium" />
            )}
          </button>
          
          {expandedSections.rating && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <label key={rating} className="flex items-center gap-2 cursor-pointer hover:bg-brown-light/5 p-2 rounded transition-colors">
                  <input
                    type="radio"
                    name="rating"
                    checked={filters.minRating === rating}
                    onChange={() => onFiltersChange({ ...filters, minRating: rating })}
                    className="w-4 h-4 text-copper border-brown-medium/30 focus:ring-copper focus:ring-offset-0"
                  />
                  <span className="text-sm text-brown-dark">{rating}+ Stars</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-brown-light/5 p-2 rounded transition-colors">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === null}
                  onChange={() => onFiltersChange({ ...filters, minRating: null })}
                  className="w-4 h-4 text-copper border-brown-medium/30 focus:ring-copper focus:ring-offset-0"
                />
                <span className="text-sm text-brown-dark">Any Rating</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Count (Mobile) */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-brown-light/30 bg-copper/5 sm:hidden flex-shrink-0 rounded-b-lg">
          <p className="text-sm text-center text-brown-medium">
            {filters.genres.length + (filters.minYear ? 1 : 0) + (filters.maxYear ? 1 : 0) + 
             (filters.minPages ? 1 : 0) + (filters.maxPages ? 1 : 0) + 
             (filters.readingLevel ? 1 : 0) + (filters.minRating ? 1 : 0)} filters active
          </p>
        </div>
      )}
    </div>
  )
}

