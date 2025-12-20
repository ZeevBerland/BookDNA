# BookDNA - Natural Language Book Search

A semantic search engine that understands books through emotions, themes, tone, and style - powered by AI.

![BookDNA](https://img.shields.io/badge/AI-Powered-copper)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Overview

BookDNA allows readers to discover books using natural language search instead of rigid keywords or genres. It uses machine learning embeddings and vector similarity search to match user queries with books based on semantic meaning.

**Example queries:**
- "Cozy fantasy with emotional healing and slow pacing"
- "A practical leadership book without storytelling fluff"
- "Dark romance with sharp dialogue and a tragic ending"

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with custom design system
- **Lucide React** - Icons

### Backend
- **Supabase** - Database and authentication
- **Supabase Edge Functions** - Serverless search API
- **PostgreSQL** - Book metadata storage

### ML Pipeline
- **sentence-transformers** - Text embeddings (all-MiniLM-L6-v2)
- **FAISS** - Vector similarity search
- **pandas** - Data processing
- **NumPy** - Numerical operations

## Project Structure

```
bookdna/
├── app/                      # Next.js app directory
│   ├── api/search/          # Search API route
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── BookCard.tsx        # Book display card
│   ├── BookGrid.tsx        # Results grid
│   └── SearchBar.tsx       # Search input
├── lib/                     # Utilities
│   ├── supabase.ts         # Supabase client
│   └── types.ts            # TypeScript types
├── scripts/                 # Python scripts
│   ├── preprocess_data.py  # Data preprocessing
│   ├── generate_embeddings.py  # Create embeddings
│   ├── build_faiss_index.py    # Build search index
│   └── upload_to_supabase.py   # Upload to database
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database schema
│   └── functions/          # Edge functions
└── data/                   # Data files
    ├── books_data.csv      # Books metadata
    └── Books_rating.csv    # User reviews
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bookdna.git
cd bookdna
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Process Data and Create Embeddings

```bash
# Step 1: Preprocess books and reviews
python scripts/preprocess_data.py

# Step 2: Generate embeddings (takes ~10-20 minutes for 210K books)
python scripts/generate_embeddings.py

# Step 3: Build FAISS index
python scripts/build_faiss_index.py
```

### 4. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database migration:
   - Open SQL Editor in Supabase dashboard
   - Run `supabase/migrations/001_create_books_table.sql`
3. Create a storage bucket named `indexes`
4. Get your API keys from Project Settings

### 5. Upload Data to Supabase

Create a `.env` file:

```env
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
HUGGINGFACE_API_KEY=your-hf-api-key
```

Upload the data:

```bash
python scripts/upload_to_supabase.py
```

### 6. Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy function
supabase functions deploy semantic-search

# Set secrets
supabase secrets set HUGGINGFACE_API_KEY=your-key
```

### 7. Set Up Frontend

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

The app will be live at `your-project.vercel.app`

## Design System

BookDNA uses a warm, academic design inspired by classic literature:

- **Colors:**
  - Background: `#F5F1E8` (cream)
  - Primary: `#4A3426` (dark brown)
  - Accent: `#C8936E` (copper)
  
- **Typography:**
  - Headings: Playfair Display (serif)
  - Body: Inter (sans-serif)

- **Style:** Clean, sophisticated with subtle shadows and rounded corners

## How It Works

1. **Data Processing:** Books and reviews are processed and combined into rich text descriptions
2. **Embedding Generation:** Each book gets a 384-dimensional vector representation using sentence-transformers
3. **Index Building:** FAISS creates a fast similarity search index
4. **Query Processing:** User queries are embedded using the same model
5. **Similarity Search:** FAISS finds the most similar books using cosine similarity
6. **Results Ranking:** Books are returned ranked by semantic similarity

## Performance

- **Search Speed:** < 2 seconds for 210K books
- **Embedding Model:** 384 dimensions (all-MiniLM-L6-v2)
- **Index Size:** ~320 MB
- **Accuracy:** Semantic matching significantly outperforms keyword search

## Credits

**Group 4**
- Course: ML 2 - Unsupervised Learning (2025)
- Instructor: Dr. Gilli Shama
- Institution: Reichman University

## License

MIT License - feel free to use this project for learning and development.

## Acknowledgments

- Google Books API for book data
- Hugging Face for embedding models
- Supabase for backend infrastructure
- FAISS for efficient similarity search

