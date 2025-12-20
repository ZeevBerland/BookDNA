"""
Prepare CSV with embeddings for bulk import
"""

import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import json

# Paths
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
BOOKS_FILE = Path("data/processed/books_clean.csv")
OUTPUT_FILE = Path("data/processed/books_with_embeddings.csv")

def main():
    print("=" * 60)
    print("Prepare Embeddings CSV")
    print("=" * 60)
    
    print("\n1. Loading embeddings...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings")
    
    print("\n2. Loading books...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    print("\n3. Adding embeddings to dataframe...")
    
    # Convert embeddings to string format for PostgreSQL vector type
    embedding_strings = []
    for i in tqdm(range(len(books_df)), desc="   Converting"):
        book_id = books_df.iloc[i]['id']
        embedding = embeddings[book_id]
        # Format as [1.23,4.56,7.89,...]
        embedding_str = f"[{','.join(map(str, embedding))}]"
        embedding_strings.append(embedding_str)
    
    books_df['embedding'] = embedding_strings
    
    print("\n4. Saving to CSV...")
    books_df.to_csv(OUTPUT_FILE, index=False)
    file_size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
    print(f"   ✓ Saved to {OUTPUT_FILE} ({file_size_mb:.1f} MB)")
    
    print("\n" + "=" * 60)
    print("✓ CSV prepared!")
    print("=" * 60)
    
    print("\nNow upload this CSV to Supabase:")
    print("1. Go to Supabase Dashboard > Table Editor > books")
    print("2. Click 'Import data from CSV'")
    print(f"3. Upload: {OUTPUT_FILE}")
    print("4. Map the 'embedding' column to the vector type")

if __name__ == "__main__":
    main()

