'use client'

import { Book } from '@/lib/types'
import BookCard from './BookCard'
import { BookOpen } from 'lucide-react'

interface BookGridProps {
  books: Book[]
  isLoading?: boolean
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-24 h-36 bg-brown-medium/10 rounded-lg skeleton" />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-brown-medium/10 rounded skeleton w-3/4" />
          <div className="h-4 bg-brown-medium/10 rounded skeleton w-1/2" />
          <div className="h-4 bg-brown-medium/10 rounded skeleton w-full" />
          <div className="h-4 bg-brown-medium/10 rounded skeleton w-full" />
          <div className="flex gap-2">
            <div className="h-6 bg-brown-medium/10 rounded skeleton w-20" />
            <div className="h-6 bg-brown-medium/10 rounded skeleton w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brown-medium/10 mb-4">
        <BookOpen className="w-10 h-10 text-brown-medium" />
      </div>
      <h3 className="font-serif text-2xl text-brown-dark mb-2">
        No books found
      </h3>
      <p className="text-brown-medium max-w-md mx-auto">
        Try adjusting your search query or exploring different themes and genres.
      </p>
    </div>
  )
}

export default function BookGrid({ books, isLoading = false }: BookGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6">
        {[...Array(6)].map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    )
  }

  if (books.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}

