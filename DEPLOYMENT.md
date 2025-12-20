# BookDNA Deployment Guide

Complete step-by-step guide to deploy BookDNA to production.

## Prerequisites

- [x] Processed data files in `data/processed/`
- [x] Supabase project created
- [x] Hugging Face account (for embeddings API)
- [x] Vercel account (for frontend deployment)
- [x] GitHub repository (optional but recommended)

## Step 1: Prepare Your Data

### Run the Data Pipeline

```bash
# Activate Python environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Process data (creates data/processed/books_clean.csv)
python scripts/preprocess_data.py

# Generate embeddings (takes 10-20 minutes)
python scripts/generate_embeddings.py

# Build FAISS index
python scripts/build_faiss_index.py
```

**Output files:**
- `data/processed/books_clean.csv` (~50 MB)
- `data/processed/embeddings.npy` (~320 MB)
- `data/processed/books_faiss.index` (~320 MB)
- `data/processed/books_metadata.json` (~5 MB)

## Step 2: Set Up Supabase

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save it!)
5. Wait for project to initialize (~2 minutes)

### 2.2 Get API Credentials

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (for frontend)
   - **Service Role Key**: `eyJhbGc...` (for backend, keep secret!)

### 2.3 Run Database Migration

**Option A: Using Supabase Dashboard**
1. Go to SQL Editor
2. Click "New Query"
3. Copy contents of `supabase/migrations/001_create_books_table.sql`
4. Paste and run

**Option B: Using Supabase CLI**
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

### 2.4 Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Click "New Bucket"
3. Name: `indexes`
4. Public: **No** (keep private)
5. Click "Create Bucket"

### 2.5 Upload Data

Create `.env` file in project root:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key...
HUGGINGFACE_API_KEY=hf_...your-hf-key...
```

Run upload script:

```bash
python scripts/upload_to_supabase.py
```

This will:
- Upload all books to the `books` table (batches of 100)
- Upload FAISS index to storage
- Upload metadata to storage

**Expected time:** 10-30 minutes depending on data size

## Step 3: Deploy Edge Function

### 3.1 Install Supabase CLI (if not already)

```bash
npm install -g supabase
```

### 3.2 Login and Link Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3.3 Deploy Function

```bash
cd supabase/functions/semantic-search
supabase functions deploy semantic-search
```

### 3.4 Set Function Secrets

```bash
# Set Hugging Face API key
supabase secrets set HUGGINGFACE_API_KEY=hf_your_key_here
```

### 3.5 Test Function

```bash
curl -X POST 'https://xxxxx.supabase.co/functions/v1/semantic-search' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "cozy fantasy with emotional healing", "limit": 5}'
```

Expected response:
```json
{
  "results": [...],
  "total": 5,
  "query": "cozy fantasy with emotional healing"
}
```

## Step 4: Deploy Frontend to Vercel

### 4.1 Push to GitHub (Recommended)

```bash
git init
git add .
git commit -m "Initial commit: BookDNA"
git branch -M main
git remote add origin https://github.com/yourusername/bookdna.git
git push -u origin main
```

### 4.2 Deploy on Vercel

**Option A: Using Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```
6. Click "Deploy"

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? bookdna
# - In which directory is your code? ./
# - Override settings? No

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

### 4.3 Verify Deployment

1. Visit your Vercel URL (e.g., `https://bookdna.vercel.app`)
2. Try a search query
3. Check for any errors in browser console
4. Verify books are displaying correctly

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to project settings in Vercel
2. Click "Domains"
3. Add your domain (e.g., `bookdna.com`)
4. Follow DNS configuration instructions

### 5.2 Update DNS

Add these records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 6: Monitoring & Optimization

### 6.1 Set Up Supabase Monitoring

1. Go to Supabase project
2. Check "Database" → "Usage"
3. Monitor:
   - Database size
   - API requests
   - Storage usage

### 6.2 Set Up Vercel Monitoring

1. Go to Vercel project
2. Check "Analytics"
3. Monitor:
   - Page views
   - Load times
   - Error rates

### 6.3 Performance Tips

**Frontend:**
- Enable Vercel Edge Cache (automatic)
- Use Image Optimization (Next.js Image component)
- Implement pagination for large result sets

**Backend:**
- Keep FAISS index in memory (Edge Function does this)
- Use Supabase connection pooling
- Add database indexes (already done in migration)

## Troubleshooting

### Issue: "Search service unavailable"

**Cause:** Edge function not deployed or secrets not set

**Fix:**
```bash
supabase functions deploy semantic-search
supabase secrets set HUGGINGFACE_API_KEY=your_key
```

### Issue: "No books found" for all queries

**Cause:** Database empty or FAISS index not uploaded

**Fix:**
```bash
python scripts/upload_to_supabase.py
```

### Issue: Build fails on Vercel

**Cause:** Missing environment variables

**Fix:**
1. Go to Vercel project settings
2. Add all required environment variables
3. Redeploy

### Issue: Slow search (>5 seconds)

**Cause:** Cold start on Edge Function

**Solution:** First search after deployment takes longer. Subsequent searches should be <2 seconds.

## Production Checklist

- [ ] Data pipeline completed successfully
- [ ] Supabase database created and migrated
- [ ] Books uploaded to database
- [ ] FAISS index uploaded to storage
- [ ] Edge function deployed and tested
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Search functionality tested end-to-end
- [ ] Mobile responsiveness verified
- [ ] Error handling tested
- [ ] Analytics set up (optional)
- [ ] Custom domain configured (optional)

## Cost Estimates

### Supabase (Free Tier)
- Database: 500 MB included
- Storage: 1 GB included
- API calls: Unlimited on free tier
- **Estimated cost:** $0/month for prototype

### Vercel (Hobby Tier)
- Bandwidth: 100 GB/month
- Build minutes: 100/month
- **Estimated cost:** $0/month for prototype

### Hugging Face Inference API
- Rate limit: ~1000 requests/day on free tier
- **Estimated cost:** $0/month for prototype

### Production Scale
For production with high traffic:
- Supabase Pro: ~$25/month
- Vercel Pro: ~$20/month
- HF Inference: ~$9/month
- **Total:** ~$54/month

## Next Steps

1. **Test thoroughly** with various queries
2. **Gather feedback** from users
3. **Monitor performance** and optimize as needed
4. **Add features:**
   - Filters (category, rating, date)
   - "Similar books" recommendations
   - User accounts and saved searches
   - Book details modal
5. **Scale as needed** based on usage

## Support

For issues or questions:
1. Check error logs in Vercel
2. Check Supabase logs
3. Review this guide
4. Check the main README.md

---

**Congratulations!** 🎉 Your BookDNA app is now live!

