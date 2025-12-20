# BookDNA Quick Start Guide

Get BookDNA running locally in 30 minutes.

## Prerequisites

- Node.js 18+ installed
- Python 3.8+ installed
- 2GB free disk space
- Internet connection

## Quick Setup (Local Development)

### 1. Install Python Dependencies (2 minutes)

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Process Sample Data (5 minutes)

For quick testing, process a small sample first:

```python
# Edit scripts/preprocess_data.py
# Add at line 50 (after loading books_df):
books_df = books_df.head(1000)  # Process only 1000 books for testing
```

Then run:

```bash
python scripts/preprocess_data.py
python scripts/generate_embeddings.py
python scripts/build_faiss_index.py
```

### 3. Set Up Supabase (10 minutes)

1. **Create account** at [supabase.com](https://supabase.com)
2. **Create project** (wait 2 minutes for initialization)
3. **Run SQL migration:**
   - Go to SQL Editor
   - Paste contents of `supabase/migrations/001_create_books_table.sql`
   - Run it
4. **Create storage bucket:**
   - Go to Storage
   - Create bucket named `indexes` (private)
5. **Get API keys:**
   - Project Settings → API
   - Copy Project URL and keys

### 4. Upload Sample Data (5 minutes)

Create `.env` file:

```env
SUPABASE_URL=your-url-here
SUPABASE_SERVICE_KEY=your-service-key-here
HUGGINGFACE_API_KEY=your-hf-key-here
```

Get a free Hugging Face API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

Upload data:

```bash
python scripts/upload_to_supabase.py
```

### 5. Deploy Edge Function (3 minutes)

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy semantic-search
supabase secrets set HUGGINGFACE_API_KEY=your-key
```

### 6. Run Frontend (5 minutes)

```bash
npm install

# Create .env.local
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Test Queries

Try these searches:
- "cozy fantasy with emotional healing"
- "dark romance with sharp dialogue"
- "practical leadership book"
- "hopeful sci-fi about AI"

## Common Issues

### "Module not found" errors

```bash
npm install
```

### Python import errors

```bash
pip install -r requirements.txt
```

### "Search service unavailable"

Check that:
1. Edge function is deployed: `supabase functions list`
2. Secrets are set: `supabase secrets list`
3. Environment variables are correct in `.env.local`

### No search results

1. Check data was uploaded: Go to Supabase → Table Editor → books
2. Verify FAISS index: Go to Supabase → Storage → indexes
3. Check browser console for errors

## Next Steps

Once working locally:
1. Process full dataset (remove `.head(1000)` limit)
2. Deploy to Vercel (see DEPLOYMENT.md)
3. Add custom features
4. Share with users!

## Need Help?

- Check the full [README.md](README.md)
- Review [DEPLOYMENT.md](DEPLOYMENT.md)
- Check error messages in:
  - Browser console (F12)
  - Terminal running `npm run dev`
  - Supabase logs

