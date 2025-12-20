export interface Book {
  id: number
  title: string
  description: string
  authors: string[]
  categories: string[]
  image_url: string
  preview_link: string
  publisher: string
  published_date: string
  ratings_count: number
  avg_rating: number
  faiss_index: number
  similarity_score?: number
}

export interface SearchResult {
  results: Book[]
  total: number
  query: string
}

export interface SearchRequest {
  query: string
  limit?: number
  category_filter?: string
  min_rating?: number
}

