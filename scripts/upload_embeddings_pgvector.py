"""
Upload embeddings to Supabase using pgvector
"""

import numpy as np
import pandas as pd
from pathlib import Path
from supabase import create_client
import os
from tqdm import tqdm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

# Paths
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
BOOKS_FILE = Path("data/processed/books_clean.csv")

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def main():
    print("=" * 60)
    print("Upload Embeddings to Supabase (pgvector)")
    print("=" * 60)
    
    # Check credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        return
    
    print("\n1. Loading embeddings...")
    if not EMBEDDINGS_FILE.exists():
        print(f"   ❌ File not found: {EMBEDDINGS_FILE}")
        return
    
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings ({embeddings.shape[1]} dims)")
    
    print("\n2. Loading books metadata...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    # Initialize Supabase client
    print("\n3. Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✓ Connected")
    
    # Upload embeddings in batches
    print("\n4. Uploading embeddings to database...")
    print("   This will take 10-15 minutes...")
    
    batch_size = 100
    total_updated = 0
    failed_batches = []
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Updating"):
        batch = books_df.iloc[i:i+batch_size]
        
        # Update each book with its embedding
        for idx, row in batch.iterrows():
            try:
                embedding_vector = embeddings[int(row['id'])].tolist()
                
                # Update the book record with embedding
                result = supabase.table('books').update({
                    'embedding': embedding_vector
                }).eq('faiss_index', int(row['id'])).execute()
                
                total_updated += 1
            except Exception as e:
                if i // batch_size not in failed_batches:
                    print(f"\n   ⚠️  Error in batch {i//batch_size + 1}: {str(e)[:100]}")
                    failed_batches.append(i // batch_size)
                continue
    
    print(f"\n   ✓ Updated {total_updated:,} books with embeddings")
    if failed_batches:
        print(f"   ⚠️  Failed batches: {len(failed_batches)}")
    
    print("\n" + "=" * 60)
    print("✓ Embeddings upload complete!")
    print("=" * 60)
    
    print(f"\nSummary:")
    print(f"  - Books with embeddings: {total_updated:,}")
    print(f"  - Failed updates: {len(failed_batches)}")
    
    print("\nNext steps:")
    print("1. Deploy updated Edge Function")
    print("2. Test search in the app!")

if __name__ == "__main__":
    main()

