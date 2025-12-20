-- BookDNA Database Schema
-- Creates the books table and necessary indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  authors JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  preview_link TEXT,
  publisher TEXT,
  published_date TEXT,
  ratings_count INTEGER DEFAULT 0,
  avg_rating FLOAT DEFAULT 0.0,
  faiss_index INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_books_faiss ON books(faiss_index);
CREATE INDEX IF NOT EXISTS idx_books_categories ON books USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_books_title ON books USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_books_rating ON books(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_books_ratings_count ON books(ratings_count DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for FAISS index (if not exists)
-- Note: This needs to be run separately in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('indexes', 'indexes', false)
-- ON CONFLICT DO NOTHING;

