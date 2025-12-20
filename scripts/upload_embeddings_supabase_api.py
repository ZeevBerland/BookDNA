"""
Upload embeddings using Supabase Python API
More reliable than direct PostgreSQL when network/DNS issues exist
"""

import numpy as np
import pandas as pd
from pathlib import Path
from supabase import create_client
import os
from tqdm import tqdm
from dotenv import load_dotenv
import time

# Load environment variables
env_local = Path('.env.local')
if env_local.exists():
    load_dotenv('.env.local', override=True)

# Paths
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
BOOKS_FILE = Path("data/processed/books_clean.csv")

# Supabase credentials (tries multiple env var names)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def main():
    print("=" * 60)
    print("Embedding Upload via Supabase API")
    print("=" * 60)
    
    print(f"\nUsing credentials from .env.local:")
    print(f"  SUPABASE_URL: {SUPABASE_URL[:40] if SUPABASE_URL else 'NOT FOUND'}...")
    print(f"  SUPABASE_KEY: {'Found (' + SUPABASE_KEY[:20] + '...)' if SUPABASE_KEY else 'NOT FOUND'}")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        print("\nMake sure .env.local has:")
        print("NEXT_PUBLIC_SUPABASE_URL=https://vmfejgecrmgzjyhtzzeh.supabase.co")
        print("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here")
        print("\nGet them from: Supabase Dashboard > Settings > API")
        return
    
    print("\n1. Loading embeddings...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings")
    
    print("\n2. Loading books...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    print("\n3. Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✓ Connected")
    
    print("\n4. Uploading embeddings...")
    print("   Using batch size of 10 for reliability...")
    print("   Estimated time: 45-60 minutes")
    print("   (This is slow but reliable - grab a coffee! ☕)")
    
    batch_size = 10  # Small batches for maximum reliability
    total_updated = 0
    failed = 0
    
    start_time = time.time()
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Uploading"):
        batch = books_df.iloc[i:i+batch_size]
        
        for _, row in batch.iterrows():
            try:
                book_id = int(row['id'])
                embedding = embeddings[book_id].tolist()
                
                # Update one at a time with retry
                for attempt in range(2):
                    try:
                        supabase.table('books').update({
                            'embedding': embedding
                        }).eq('faiss_index', book_id).execute()
                        total_updated += 1
                        break
                    except Exception as e:
                        if attempt == 1:
                            failed += 1
                        time.sleep(0.1)
                        
            except Exception as e:
                failed += 1
                continue
        
        # Progress update every 100 books
        if (i + batch_size) % 100 == 0:
            elapsed = (time.time() - start_time) / 60
            rate = total_updated / elapsed if elapsed > 0 else 0
            remaining = (len(books_df) - total_updated) / rate if rate > 0 else 0
            print(f"\n   Progress: {total_updated:,} done | {failed} failed | ~{remaining:.0f} min remaining")
    
    elapsed_total = (time.time() - start_time) / 60
    print(f"\n   ✓ Complete in {elapsed_total:.1f} minutes")
    print(f"   ✓ Updated: {total_updated:,}")
    print(f"   ❌ Failed: {failed}")
    
    print("\n" + "=" * 60)
    print("✓ Embeddings uploaded!")
    print("=" * 60)

if __name__ == "__main__":
    main()

