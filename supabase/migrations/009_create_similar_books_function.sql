-- Create function to find similar books using vector similarity
-- Phase 2: Recommendations feature

CREATE OR REPLACE FUNCTION find_similar_books(
  source_embedding vector(384),
  source_book_id int,
  match_limit int DEFAULT 10,
  same_genre_only boolean DEFAULT false,
  source_categories jsonb DEFAULT NULL
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
    1 - (books.embedding <=> source_embedding) as similarity_score,
    books.page_count,
    books.reading_level,
    books.published_year
  FROM books
  WHERE books.id != source_book_id
    AND books.embedding IS NOT NULL
    -- Optional genre filter: only recommend books with overlapping categories
    AND (
      NOT same_genre_only 
      OR (source_categories IS NOT NULL AND books.categories ?| (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(source_categories) AS elem))
    )
  ORDER BY books.embedding <=> source_embedding ASC
  LIMIT match_limit;
END;
$$;

-- Add index to improve recommendation performance
CREATE INDEX IF NOT EXISTS idx_books_embedding_cosine ON books USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Add helpful comment
COMMENT ON FUNCTION find_similar_books IS 'Find similar books using vector cosine similarity for recommendations';

