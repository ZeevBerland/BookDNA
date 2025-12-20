-- Improve search ranking - optimized for performance
-- Apply this version to fix timeout issues

CREATE OR REPLACE FUNCTION search_books_by_embedding(
  query_embedding vector(384),
  match_limit int DEFAULT 20,
  category_filter text DEFAULT NULL,
  min_rating float DEFAULT 0
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
  similarity_score float
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
    1 - (books.embedding <=> query_embedding) as similarity_score
  FROM books
  WHERE books.embedding IS NOT NULL
    AND (category_filter IS NULL OR books.categories::text ILIKE '%' || category_filter || '%')
    AND books.avg_rating >= min_rating
  -- Order by similarity first (uses index), then rating, then popularity
  ORDER BY 
    books.embedding <=> query_embedding ASC,
    books.avg_rating DESC,
    books.ratings_count DESC
  LIMIT match_limit;
END;
$$;

