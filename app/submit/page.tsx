'use client'

import { useState } from 'react'
import { Upload, Book, Plus, X } from 'lucide-react'

export default function SubmitBookPage() {
  const [authors, setAuthors] = useState<string[]>([''])
  const [categories, setCategories] = useState<string[]>([''])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const addAuthor = () => setAuthors([...authors, ''])
  const removeAuthor = (index: number) => setAuthors(authors.filter((_, i) => i !== index))
  const updateAuthor = (index: number, value: string) => {
    const newAuthors = [...authors]
    newAuthors[index] = value
    setAuthors(newAuthors)
  }

  const addCategory = () => setCategories([...categories, ''])
  const removeCategory = (index: number) => setCategories(categories.filter((_, i) => i !== index))
  const updateCategory = (index: number, value: string) => {
    const newCategories = [...categories]
    newCategories[index] = value
    setCategories(newCategories)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // This is just UI - no actual submission
    alert('Thank you! Your book submission has been received. We will review it shortly.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-paper via-white to-beige">
      {/* Header */}
      <header className="border-b border-brown-light/30 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Book className="w-8 h-8 text-copper" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-brown-dark">BookDNA</h1>
              <p className="text-xs text-brown-medium">Publisher Portal</p>
            </div>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-brown-dark mb-4">
            Submit Your Book
          </h2>
          <p className="text-lg text-brown-medium max-w-2xl mx-auto">
            Help readers discover your book through semantic search. Fill out the form below to add your book to our database.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card">
          {/* Basic Information */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Basic Information
            </h3>
            
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Book Title <span className="text-copper">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter the full title of your book"
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  ISBN
                </label>
                <input
                  type="text"
                  placeholder="ISBN-10 or ISBN-13"
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Description <span className="text-copper">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide a compelling description of your book. This will be used for semantic search."
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </section>

          {/* Authors */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Author(s)
            </h3>
            
            <div className="space-y-3">
              {authors.map((author, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => updateAuthor(index, e.target.value)}
                    placeholder={`Author ${index + 1}`}
                    required={index === 0}
                    className="flex-1 px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                  />
                  {authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(index)}
                      className="px-3 py-3 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAuthor}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-copper text-copper hover:bg-copper hover:text-white transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Another Author
              </button>
            </div>
          </section>

          {/* Publisher Info */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Publisher Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Publisher Name <span className="text-copper">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your publishing house name"
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Publication Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Categories & Genres
            </h3>
            
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => updateCategory(index, e.target.value)}
                    placeholder={`Category ${index + 1} (e.g., Fiction, Mystery, Romance)`}
                    required={index === 0}
                    className="flex-1 px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                  />
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      className="px-3 py-3 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCategory}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-copper text-copper hover:bg-copper hover:text-white transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Another Category
              </button>
            </div>
          </section>

          {/* Cover Image */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Book Cover
            </h3>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Upload Area */}
              <div className="flex-1">
                <label className="block">
                  <div className="border-2 border-dashed border-brown-light/50 rounded-lg p-8 text-center hover:border-copper hover:bg-copper/5 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-brown-medium mx-auto mb-4" />
                    <p className="text-brown-dark font-medium mb-2">Click to upload book cover</p>
                    <p className="text-sm text-brown-medium">PNG, JPG up to 10MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </label>
              </div>

              {/* Preview */}
              {coverPreview && (
                <div className="w-full md:w-48">
                  <p className="text-sm font-semibold text-brown-dark mb-2">Preview</p>
                  <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={coverPreview} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Additional Info */}
          <section className="mb-8">
            <h3 className="text-2xl font-serif font-bold text-brown-dark mb-6 pb-2 border-b border-brown-light/30">
              Additional Information
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Preview Link / Purchase URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/your-book"
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Additional Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Any additional information you'd like to share..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-brown-light/30 focus:border-copper focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              className="px-8 py-4 bg-copper text-white rounded-lg font-semibold text-lg hover:bg-copper/90 transition-colors shadow-lg hover:shadow-xl"
            >
              Submit Book for Review
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-sm text-brown-medium/70 mt-6">
            * This is a demo form. No data is actually submitted.
          </p>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-brown-light/30 bg-white/50 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-brown-medium text-sm">
          <p>&copy; 2025 BookDNA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

