'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Star, DollarSign } from 'lucide-react'
import { Book } from '@/lib/types'
import BookPrices from './BookPrices'

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const [showPrices, setShowPrices] = useState(false)
  
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
    </div>
  )
}

