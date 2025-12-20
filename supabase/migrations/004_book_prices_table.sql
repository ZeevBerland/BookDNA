-- Table to cache book prices from Gemini API
CREATE TABLE IF NOT EXISTS book_prices (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE UNIQUE,
  isbn TEXT,
  
  -- Price data (JSON array of retailer prices)
  prices JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- AI-generated summary
  summary TEXT,
  
  -- Source metadata from Gemini
  sources JSONB DEFAULT '[]'::jsonb,
  
  -- Cache metadata
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_book_prices_book_id ON book_prices(book_id);
CREATE INDEX idx_book_prices_last_fetched ON book_prices(last_fetched DESC);

-- Optional: Add ISBN to books table if needed
ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn TEXT;
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

