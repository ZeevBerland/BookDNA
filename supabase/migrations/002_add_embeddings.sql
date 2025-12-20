-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embeddings column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS books_embedding_idx ON books 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add index on faiss_index for lookups
CREATE INDEX IF NOT EXISTS books_faiss_index_idx ON books(faiss_index);

