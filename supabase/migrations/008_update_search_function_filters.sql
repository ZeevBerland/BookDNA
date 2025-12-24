-- Update search function to support Phase 2 advanced filters
-- Drop existing function and recreate with new parameters

DROP FUNCTION IF EXISTS search_books_by_embedding;

CREATE OR REPLACE FUNCTION search_books_by_embedding(
  query_embedding vector(384),
  match_limit int DEFAULT 20,
  category_filter text DEFAULT NULL,
  min_rating float DEFAULT 0,
  -- Phase 2: Advanced Filters
  genres_filter text[] DEFAULT NULL,
  min_year_filter int DEFAULT NULL,
  max_year_filter int DEFAULT NULL,
  min_pages_filter int DEFAULT NULL,
  max_pages_filter int DEFAULT NULL,
  reading_level_filter text DEFAULT NULL
)
RETURNS TABLE (
  id int,
  title text,
  description text,
  authors jsonb,
  categories jsonb,
  image_url text,
  preview_link text,
  publisher text,
  published_date text,
  ratings_count int,
  avg_rating float,
  faiss_index int,
  similarity_score float,
  -- Include new fields in result
  page_count int,
  reading_level text,
  published_year int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    books.id,
    books.title,
    books.description,
    books.authors,
    books.categories,
    books.image_url,
    books.preview_link,
    books.publisher,
    books.published_date,
    books.ratings_count,
    books.avg_rating,
    books.faiss_index,
    1 - (books.embedding <=> query_embedding) as similarity_score,
    books.page_count,
    books.reading_level,
    books.published_year
  FROM books
  WHERE books.embedding IS NOT NULL
    -- Existing filters
    AND (category_filter IS NULL OR books.categories::text ILIKE '%' || category_filter || '%')
    AND books.avg_rating >= min_rating
    -- Phase 2: Advanced Filters
    AND (genres_filter IS NULL OR books.categories ?| genres_filter)  -- JSONB array overlap
    AND (min_year_filter IS NULL OR books.published_year >= min_year_filter)
    AND (max_year_filter IS NULL OR books.published_year <= max_year_filter)
    AND (min_pages_filter IS NULL OR books.page_count >= min_pages_filter)
    AND (max_pages_filter IS NULL OR books.page_count <= max_pages_filter)
    AND (reading_level_filter IS NULL OR books.reading_level = reading_level_filter)
  -- First order by similarity (uses index), then by rating, then by popularity
  ORDER BY 
    books.embedding <=> query_embedding ASC,
    books.avg_rating DESC,
    books.ratings_count DESC
  LIMIT match_limit;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION search_books_by_embedding IS 'Semantic search with Phase 2 advanced filters (genres, year range, page count, reading level)';

