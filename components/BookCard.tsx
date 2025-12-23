'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Star, DollarSign, Sparkles, Loader2, X } from 'lucide-react'
import { Book } from '@/lib/types'
import BookPrices from './BookPrices'

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const [showPrices, setShowPrices] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
  const [expandedRecBook, setExpandedRecBook] = useState<Book | null>(null)
  
  const {
    id,
    title,
    description,
    authors,
    categories,
    image_url,
    preview_link,
    avg_rating,
    ratings_count,
    similarity_score
  } = book

  const displayRating = avg_rating > 0 ? avg_rating.toFixed(1) : null
  const authorName = authors && authors.length > 0 ? authors[0] : 'Unknown'

  const fetchRecommendations = async () => {
    if (recommendations.length > 0) {
      // Already fetched, just toggle
      setShowRecommendations(!showRecommendations)
      return
    }

    setLoadingRecommendations(true)
    setRecommendationsError(null)
    setShowRecommendations(true)

    try {
      const response = await fetch(`/api/recommendations?bookId=${id}&limit=6`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      setRecommendationsError('Failed to load recommendations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  return (
    <div className="card group hover:scale-[1.02] transition-transform duration-300">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Book Cover */}
        <div className="flex-shrink-0 w-full sm:w-24 h-48 sm:h-36 relative bg-brown-medium/10 rounded-lg overflow-hidden mx-auto sm:mx-0 max-w-[160px] sm:max-w-none">
          {image_url ? (
            <Image
              src={image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 160px, 96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brown-medium/50 text-xs text-center p-2">
              No cover
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-serif text-lg sm:text-xl font-semibold text-brown-dark mb-2 line-clamp-2">
            {title}
          </h3>

          {/* Authors */}
          {authors && authors.length > 0 && (
            <p className="text-brown-medium text-sm mb-2">
              by {authors.join(', ')}
            </p>
          )}

          {/* Rating */}
          {displayRating && (
            <div className="flex items-center gap-1 mb-3">
              <Star className="w-4 h-4 fill-copper text-copper" />
              <span className="font-medium text-brown-dark">{displayRating}</span>
              {ratings_count > 0 && (
                <span className="text-brown-medium text-sm">
                  ({ratings_count.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.slice(0, 3).map((category, index) => (
                <span key={index} className="badge text-xs">
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-brown-dark/80 text-sm line-clamp-3 mb-4 hidden sm:block">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {preview_link && (
              <a
                href={preview_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-copper text-white text-sm font-medium hover:bg-copper/90 transition-colors"
              >
                <span>Preview</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => setShowPrices(!showPrices)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                showPrices 
                  ? 'bg-copper text-white border-copper' 
                  : 'border-copper text-copper hover:bg-copper hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{showPrices ? 'Hide' : 'Check'} Prices</span>
            </button>

            {/* Phase 2: Similar Books Button */}
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecommendations}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                showRecommendations 
                  ? 'bg-brown-dark text-white border-brown-dark' 
                  : 'border-brown-dark text-brown-dark hover:bg-brown-dark hover:text-white'
              }`}
            >
              {loadingRecommendations ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{showRecommendations ? 'Hide' : 'Similar'} Books</span>
            </button>

            {/* Similarity Score (for debugging/demo) */}
            {similarity_score !== undefined && (
              <span className="text-xs text-brown-medium/60 text-center sm:text-left">
                Match: {(similarity_score * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline Price Section */}
      {showPrices && (
        <div className="mt-6 pt-6 border-t border-brown-medium/20 animate-in slide-in-from-top duration-300">
          <BookPrices
            bookId={id}
            title={title}
            author={authorName}
            isbn={undefined}
          />
        </div>
      )}

      {/* Phase 2: Similar Books Section */}
      {showRecommendations && (
        <div className="mt-6 pt-6 border-t border-brown-medium/20 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brown-dark" />
            <h4 className="font-serif text-lg font-semibold text-brown-dark">Similar Books</h4>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-copper" />
              <span className="ml-2 text-brown-medium">Finding similar books...</span>
            </div>
          ) : recommendationsError ? (
            <div className="text-center py-4 text-red-600 text-sm">
              {recommendationsError}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-4 text-brown-medium text-sm">
              No similar books found
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex gap-4 pb-2">
                {recommendations.map((recBook) => (
                  <div
                    key={recBook.id}
                    onClick={() => setExpandedRecBook(recBook)}
                    className={`flex-shrink-0 w-40 bg-white border-2 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group ${
                      expandedRecBook?.id === recBook.id 
                        ? 'border-copper shadow-md' 
                        : 'border-brown-light/30'
                    }`}
                  >
                    {/* Cover */}
                    <div className="relative w-full h-48 bg-brown-medium/10 rounded mb-2 overflow-hidden">
                      {recBook.image_url ? (
                        <Image
                          src={recBook.image_url}
                          alt={recBook.title}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brown-medium/50 text-xs">
                          No cover
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h5 className="font-medium text-sm text-brown-dark line-clamp-2 mb-1 group-hover:text-copper transition-colors">
                      {recBook.title}
                    </h5>

                    {/* Author */}
                    {recBook.authors && recBook.authors.length > 0 && (
                      <p className="text-xs text-brown-medium line-clamp-1 mb-2">
                        {recBook.authors[0]}
                      </p>
                    )}

                    {/* Rating */}
                    {recBook.avg_rating > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 fill-copper text-copper" />
                        <span className="font-medium text-brown-dark">
                          {recBook.avg_rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Preview Link */}
                    {recBook.preview_link && (
                      <a
                        href={recBook.preview_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-copper hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Recommended Book - Mobile Modal / Desktop Inline */}
          {expandedRecBook && (
            <>
              {/* Mobile: Full-screen modal overlay */}
              <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setExpandedRecBook(null)}>
                <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-2xl overflow-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white border-b border-brown-light/30 p-4 flex items-center justify-between z-10">
                    <h5 className="font-serif text-lg font-semibold text-brown-dark">Book Details</h5>
                    <button
                      onClick={() => setExpandedRecBook(null)}
                      className="p-2 hover:bg-brown-light/10 rounded-lg transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 text-brown-medium" />
                    </button>
                  </div>
                  <div className="p-4">
                    <BookCard book={expandedRecBook} />
                  </div>
                </div>
              </div>

              {/* Desktop: Inline expansion */}
              <div className="hidden lg:block mt-6 pt-6 border-t border-brown-light/30 animate-in slide-in-from-top duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-serif text-base font-semibold text-brown-dark">Selected Book Details</h5>
                  <button
                    onClick={() => setExpandedRecBook(null)}
                    className="text-sm text-brown-medium hover:text-copper transition-colors"
                  >
                    Close
                  </button>
                </div>
                <BookCard book={expandedRecBook} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

