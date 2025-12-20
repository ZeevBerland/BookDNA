# 🚀 BookDNA - Next Steps

## ✅ What's Already Done

- ✅ Python 3.13.1 and Node.js v23.8.0 installed
- ✅ Virtual environment created
- ✅ All Python dependencies installed (pandas, sentence-transformers, faiss, etc.)
- ✅ All Node.js dependencies installed (Next.js, React, Tailwind, etc.)
- ✅ Project structure created
- ✅ Frontend running at http://localhost:3000
- ✅ Environment files created (.env, .env.local)

## 📋 What You Need to Do Next

### **Option A: Quick Demo (Without Backend) - 5 minutes**

Just to see the UI and how it looks:

1. Open your browser to **http://localhost:3000**
2. You'll see the beautiful BookDNA interface!
3. The search won't work yet (needs backend), but you can see the design

### **Option B: Full Setup with Backend - 1-2 hours**

To get the semantic search actually working, follow these steps:

---

## Step 1: Process Your Data (~30-45 minutes)

Since you have 210K+ books and millions of reviews, this will take time:

```bash
# Make sure virtual environment is activated
.\venv\Scripts\activate

# Step 1: Preprocess data (10-15 min)
python scripts/preprocess_data.py

# Step 2: Generate embeddings (15-20 min)
# This creates 384-dimensional vectors for each book
python scripts/generate_embeddings.py

# Step 3: Build FAISS index (2-3 min)
python scripts/build_faiss_index.py
```

**What these scripts do:**
- `preprocess_data.py` - Combines books + reviews, cleans data
- `generate_embeddings.py` - Creates semantic vectors using ML
- `build_faiss_index.py` - Builds fast search index

**Output files created:**
- `data/processed/books_clean.csv` (~50 MB)
- `data/processed/embeddings.npy` (~320 MB)
- `data/processed/books_faiss.index` (~320 MB)
- `data/processed/books_metadata.json` (~5 MB)

---

## Step 2: Set Up Supabase (~15 minutes)

### 2.1 Create Supabase Project (5 min)

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login (free tier is perfect for this)
3. Click "New Project"
4. Choose:
   - Organization: Create new or use existing
   - Project name: `bookdna`
   - Database password: (save this!)
   - Region: Choose closest to you
5. Wait 2-3 minutes for project to initialize

### 2.2 Run Database Migration (3 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_create_books_table.sql`
4. Paste and click "Run"
5. You should see "Success" message

### 2.3 Create Storage Bucket (2 min)

1. In Supabase dashboard, go to **Storage**
2. Click "New Bucket"
3. Name: `indexes`
4. Public: **No** (keep private)
5. Click "Create Bucket"

### 2.4 Get API Keys (2 min)

1. Go to **Project Settings** → **API**
2. Copy these three values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (different long string)

### 2.5 Update Environment Files (3 min)

Edit `.env` file:
```env
SUPABASE_URL=https://your-actual-project-url.supabase.co
SUPABASE_SERVICE_KEY=your-actual-service-role-key
HUGGINGFACE_API_KEY=hf_your-key-here
```

Edit `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

**To get Hugging Face API key (free):**
1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Name: `bookdna`
4. Role: Read
5. Copy the token

---

## Step 3: Upload Data to Supabase (~10-15 minutes)

```bash
# Make sure virtual environment is activated
.\venv\Scripts\activate

# Upload all processed data
python scripts/upload_to_supabase.py
```

This will:
- Upload all ~210K books to the database (batches of 100)
- Upload FAISS index to storage (~320 MB)
- Upload metadata to storage

---

## Step 4: Deploy Edge Function (~10 minutes)

### 4.1 Install Supabase CLI

```powershell
npm install -g supabase
```

### 4.2 Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Find your project-ref in Supabase dashboard -> Project Settings -> General
```

### 4.3 Deploy the Function

```bash
# Deploy semantic search function
supabase functions deploy semantic-search

# Set the Hugging Face API key as a secret
supabase secrets set HUGGINGFACE_API_KEY=hf_your-actual-key
```

---

## Step 5: Test the Full Application! 🎉

1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```

2. Open **http://localhost:3000**

3. Try these search queries:
   - "Cozy fantasy with emotional healing and slow pacing"
   - "Dark romance with sharp dialogue and a tragic ending"
   - "Practical leadership book without storytelling fluff"
   - "Hopeful sci-fi about humanity and AI"

4. You should see relevant book results!

---

## Step 6: Deploy to Production (Optional - ~15 minutes)

### Deploy to Vercel (Free)

1. Push your code to GitHub (if not already):
   ```bash
   git init
   git add .
   git commit -m "BookDNA complete implementation"
   git branch -M main
   git remote add origin https://github.com/yourusername/bookdna.git
   git push -u origin main
   ```

2. Go to [https://vercel.com](https://vercel.com)
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"
7. Your app will be live at `https://your-app.vercel.app`!

---

## 🆘 Troubleshooting

### "Search service unavailable"
- Check that Edge Function is deployed: `supabase functions list`
- Verify secrets are set: `supabase secrets list`
- Check .env.local has correct Supabase URL and key

### "No books found" for all queries
- Verify data was uploaded: Check Supabase dashboard → Table Editor → books
- Check FAISS index exists: Supabase → Storage → indexes bucket
- Look at browser console (F12) for errors

### Python import errors
```bash
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Node.js errors
```bash
npm install
```

---

## 📚 Additional Resources

- **Full documentation**: See `README.md`
- **Detailed deployment**: See `DEPLOYMENT.md`
- **Quick reference**: See `QUICKSTART.md`
- **Design system**: See `app/globals.css` for colors and styles

---

## 💡 Tips

1. **Start small**: Process a sample of 1000 books first to test faster
   - Edit `scripts/preprocess_data.py`, add `books_df = books_df.head(1000)` at line 50
   
2. **Check progress**: All scripts show progress bars

3. **Expect time**: Full data processing for 210K books takes 30-45 minutes

4. **Free tier limits**: 
   - Supabase: 500MB database, 1GB storage (plenty for this project)
   - Hugging Face: ~1000 API calls/day on free tier
   - Vercel: 100GB bandwidth/month

---

## Current Status

Your BookDNA is currently:
- ✅ Frontend running locally (http://localhost:3000)
- ⏳ Waiting for backend setup (Supabase + data processing)

**Estimated time to full working app:** 1-2 hours

Good luck! 🚀

