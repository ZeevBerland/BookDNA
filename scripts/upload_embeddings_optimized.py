"""
Optimized embedding upload using batch upserts
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
    print("Optimized Embedding Upload")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
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
    
    print("\n4. Uploading embeddings (optimized batches)...")
    print("   Using batch size of 50 with retry logic...")
    
    batch_size = 50  # Smaller batches for reliability
    total_updated = 0
    failed = 0
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Uploading"):
        batch = books_df.iloc[i:i+batch_size]
        
        # Prepare batch of records with embeddings
        records = []
        for _, row in batch.iterrows():
            try:
                book_id = int(row['id'])
                embedding_list = embeddings[book_id].tolist()
                
                records.append({
                    'faiss_index': book_id,
                    'embedding': embedding_list
                })
            except Exception as e:
                failed += 1
                continue
        
        if not records:
            continue
        
        # Try to update batch
        for retry in range(3):
            try:
                # Update using PostgreSQL's UPDATE with multiple WHERE clauses
                for record in records:
                    supabase.table('books').update({
                        'embedding': record['embedding']
                    }).eq('faiss_index', record['faiss_index']).execute()
                
                total_updated += len(records)
                break
            except Exception as e:
                if retry < 2:
                    time.sleep(1)  # Wait before retry
                else:
                    failed += len(records)
                    print(f"\n   ❌ Batch failed after 3 retries")
    
    print(f"\n   ✓ Updated: {total_updated:,}")
    print(f"   ❌ Failed: {failed}")
    
    estimated_time = (len(books_df) / total_updated) * (time.time() / 60) if total_updated > 0 else 0
    print(f"   ⏱ Estimated total time: ~{estimated_time:.0f} minutes")
    
    print("\n" + "=" * 60)
    print("✓ Upload process running...")
    print("=" * 60)

if __name__ == "__main__":
    main()

