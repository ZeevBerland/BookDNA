"""
Fast embedding upload using SQL bulk operations
"""

import numpy as np
import pandas as pd
from pathlib import Path
from supabase import create_client
import os
from tqdm import tqdm
from dotenv import load_dotenv
import json

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
    print("Fast Embedding Upload (SQL Bulk)")
    print("=" * 60)
    
    # Check credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        return
    
    print("\n1. Loading embeddings...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings ({embeddings.shape[1]} dims)")
    
    print("\n2. Loading books metadata...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    # Initialize Supabase client
    print("\n3. Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✓ Connected")
    
    # Prepare batch SQL updates
    print("\n4. Preparing batch updates...")
    print("   Using large batches (1000) for speed...")
    
    batch_size = 1000
    total_updated = 0
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Processing"):
        batch = books_df.iloc[i:i+batch_size]
        
        # Build SQL for batch update using CASE WHEN
        updates = []
        faiss_indices = []
        
        for idx, row in batch.iterrows():
            faiss_idx = int(row['id'])
            embedding_vector = embeddings[faiss_idx].tolist()
            embedding_str = f"'[{','.join(map(str, embedding_vector))}]'"
            
            updates.append(f"WHEN {faiss_idx} THEN {embedding_str}::vector")
            faiss_indices.append(str(faiss_idx))
        
        # Build the SQL query
        sql_query = f"""
        UPDATE books 
        SET embedding = CASE faiss_index
        {chr(10).join(updates)}
        END
        WHERE faiss_index IN ({','.join(faiss_indices)})
        """
        
        try:
            # Execute bulk update using RPC
            result = supabase.rpc('exec_sql', {'query': sql_query}).execute()
            total_updated += len(batch)
        except Exception as e:
            # Fallback: use smaller batches if SQL is too large
            print(f"\n   ⚠️  Batch too large, splitting...")
            for j in range(i, min(i + batch_size, len(books_df))):
                try:
                    row = books_df.iloc[j]
                    embedding_vector = embeddings[int(row['id'])].tolist()
                    
                    supabase.table('books').update({
                        'embedding': embedding_vector
                    }).eq('faiss_index', int(row['id'])).execute()
                    
                    total_updated += 1
                except:
                    continue
    
    print(f"\n   ✓ Updated {total_updated:,} books with embeddings")
    
    print("\n" + "=" * 60)
    print("✓ Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

