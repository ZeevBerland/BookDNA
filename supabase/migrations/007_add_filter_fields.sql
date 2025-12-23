-- Add filter fields for advanced search functionality
-- Phase 2: Advanced Filters

-- Add new columns to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS reading_level TEXT CHECK (reading_level IN ('beginner', 'intermediate', 'advanced', NULL)),
ADD COLUMN IF NOT EXISTS published_year INTEGER;

-- Note: Data population will be done separately via script to avoid timeout

-- Create indexes for filter fields to improve query performance
CREATE INDEX IF NOT EXISTS idx_books_page_count ON books(page_count) WHERE page_count IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_reading_level ON books(reading_level) WHERE reading_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_published_year ON books(published_year DESC) WHERE published_year IS NOT NULL;

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_books_filters ON books(published_year, avg_rating, page_count) 
WHERE published_year IS NOT NULL OR page_count IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN books.page_count IS 'Approximate number of pages in the book';
COMMENT ON COLUMN books.reading_level IS 'Difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN books.published_year IS 'Year of publication extracted from published_date';

