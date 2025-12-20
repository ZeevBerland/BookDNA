# BookDNA Supabase Setup

This directory contains the Supabase configuration for BookDNA.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 2. Run Database Migration

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Alternatively, run the SQL from `migrations/001_create_books_table.sql` directly in the Supabase SQL Editor.

### 3. Create Storage Bucket

In the Supabase Dashboard:
1. Go to Storage
2. Create a new bucket named `indexes`
3. Set it to private (authenticated access only)

### 4. Upload Data

Set up your environment variables:

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your credentials:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_KEY=your-service-key
```

Run the upload script:

```bash
python scripts/upload_to_supabase.py
```

### 5. Deploy Edge Function

```bash
# Deploy the semantic-search function
supabase functions deploy semantic-search

# Set secrets for the function
supabase secrets set HUGGINGFACE_API_KEY=your-hf-api-key
```

### 6. Test the Function

```bash
curl -X POST https://your-project.supabase.co/functions/v1/semantic-search \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "cozy fantasy with emotional healing", "limit": 10}'
```

## Environment Variables

The edge function requires:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for database access)
- `HUGGINGFACE_API_KEY` - Hugging Face API key for embeddings

## Database Schema

See `migrations/001_create_books_table.sql` for the complete schema.

Key tables:
- `books` - Main books table with metadata and FAISS index reference

## Storage

- `indexes/books_faiss.index` - FAISS vector index file
- `indexes/books_metadata.json` - Metadata mapping

