# BookDNA Deployment Guide

## 🚀 Quick Start

BookDNA is deployed as a Next.js application with Supabase backend.

## Prerequisites

- Node.js 18+ 
- Python 3.12+ (for data processing)
- Supabase account
- GitHub account

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ACCESS_TOKEN=your_access_token
DATABASE_URL=your_database_url

# API Keys
HUGGINGFACE_API_KEY=your_huggingface_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## Deployment Steps

### 1. Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### 2. Setup Supabase (Backend)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push database migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy semantic-search --no-verify-jwt
npx supabase functions deploy fetch-book-prices --no-verify-jwt
```

### 3. Process and Upload Data

```bash
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Process data (optimized version)
python scripts/preprocess_data_optimized.py

# Generate embeddings (GPU recommended)
python scripts/generate_embeddings.py

# Upload to Supabase
python scripts/upload_embeddings_supabase_api.py
```

## Post-Deployment

### Set Edge Function Secrets

```bash
# Set Hugging Face API key
npx supabase secrets set HUGGINGFACE_API_KEY=your_key

# Set Gemini API key
npx supabase secrets set GEMINI_API_KEY=your_key
```

### Verify Deployment

1. Visit your deployed URL
2. Try a search query
3. Test price comparison feature
4. Check publisher submission form

## Architecture

- **Frontend**: Next.js 15 + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **Search**: Semantic search with sentence-transformers embeddings
- **AI Enhancement**: Gemini API for query enhancement and price comparison
- **Embeddings**: Hugging Face API (384-dimensional vectors)

## Troubleshooting

### Search Not Working
- Check Hugging Face API key in Edge Function secrets
- Verify embeddings are uploaded to database
- Check Edge Function logs

### Price Comparison Errors
- Verify Gemini API key is set
- Check rate limits
- Review Edge Function logs for specific errors

### Slow Performance
- Ensure vector indexes are created
- Check database connection pooling
- Verify Edge Functions are deployed to correct region

## Monitoring

- **Supabase Dashboard**: Monitor Edge Function logs
- **Vercel Dashboard**: Check frontend performance
- **Database**: Monitor query performance and storage

## Support

For issues, check:
1. Supabase Edge Function logs
2. Browser console errors
3. Network tab for failed requests
4. Database connection status

