"""
BookDNA FAISS Index Builder
Creates a FAISS index for fast similarity search
"""

import pandas as pd
import numpy as np
import faiss
import json
from pathlib import Path

# Paths
BOOKS_FILE = Path("data/processed/books_clean.csv")
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
INDEX_FILE = Path("data/processed/books_faiss.index")
METADATA_FILE = Path("data/processed/books_metadata.json")

def main():
    print("=" * 60)
    print("BookDNA FAISS Index Builder")
    print("=" * 60)
    
    # Check if input files exist
    if not EMBEDDINGS_FILE.exists():
        print(f"\n❌ Error: {EMBEDDINGS_FILE} not found!")
        print("   Please run generate_embeddings.py first.")
        return
    
    if not BOOKS_FILE.exists():
        print(f"\n❌ Error: {BOOKS_FILE} not found!")
        print("   Please run preprocess_data.py first.")
        return
    
    # Load embeddings
    print(f"\n1. Loading embeddings from {EMBEDDINGS_FILE}...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Shape: {embeddings.shape}")
    print(f"   Data type: {embeddings.dtype}")
    
    # Convert to float32 if needed (FAISS requirement)
    if embeddings.dtype != np.float32:
        print("   Converting to float32...")
        embeddings = embeddings.astype(np.float32)
    
    # Normalize embeddings for cosine similarity
    print("\n2. Normalizing embeddings for cosine similarity...")
    faiss.normalize_L2(embeddings)
    print("   ✓ Normalized")
    
    # Build FAISS index
    print("\n3. Building FAISS index...")
    dimension = embeddings.shape[1]
    print(f"   Dimension: {dimension}")
    
    # Use IndexFlatIP (Inner Product) for cosine similarity on normalized vectors
    index = faiss.IndexFlatIP(dimension)
    
    print(f"   Adding {len(embeddings):,} vectors to index...")
    index.add(embeddings)
    
    print(f"   ✓ Index built with {index.ntotal:,} vectors")
    
    # Save index
    print(f"\n4. Saving index to {INDEX_FILE}...")
    faiss.write_index(index, str(INDEX_FILE))
    file_size_mb = INDEX_FILE.stat().st_size / 1024 / 1024
    print(f"   ✓ Saved successfully! ({file_size_mb:.2f} MB)")
    
    # Create metadata mapping
    print(f"\n5. Creating metadata mapping...")
    books_df = pd.read_csv(BOOKS_FILE)
    
    metadata = []
    for idx, row in books_df.iterrows():
        metadata.append({
            'faiss_index': idx,
            'id': int(row['id']),
            'title': row['title']
        })
    
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"   ✓ Saved metadata for {len(metadata):,} books")
    
    # Test the index
    print("\n6. Testing index with sample query...")
    
    # Load the index back
    test_index = faiss.read_index(str(INDEX_FILE))
    
    # Use first embedding as test query
    test_query = embeddings[0:1]
    k = 5  # Return top 5 results
    
    distances, indices = test_index.search(test_query, k)
    
    print(f"\n   Test query results (top {k}):")
    for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
        book_title = books_df.iloc[idx]['title']
        print(f"   {i+1}. {book_title[:60]}... (similarity: {dist:.4f})")
    
    print("\n" + "=" * 60)
    print("✓ FAISS index creation complete!")
    print("=" * 60)
    
    print("\nIndex Statistics:")
    print(f"  - Total vectors: {test_index.ntotal:,}")
    print(f"  - Dimension: {dimension}")
    print(f"  - Index type: IndexFlatIP (exact search, cosine similarity)")
    print(f"  - File size: {file_size_mb:.2f} MB")
    
    print(f"\nNext step: Set up Supabase and run upload_to_supabase.py")

if __name__ == "__main__":
    main()

