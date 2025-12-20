"""
BookDNA Embedding Generation
Generates semantic embeddings for all books using sentence-transformers
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import torch

# Paths
INPUT_FILE = Path("data/processed/books_clean.csv")
OUTPUT_FILE = Path("data/processed/embeddings.npy")

def main():
    print("=" * 60)
    print("BookDNA Embedding Generation")
    print("=" * 60)
    
    # Check if input file exists
    if not INPUT_FILE.exists():
        print(f"\n❌ Error: {INPUT_FILE} not found!")
        print("   Please run preprocess_data.py first.")
        return
    
    # Load clean books data
    print(f"\n1. Loading books from {INPUT_FILE}...")
    books_df = pd.read_csv(INPUT_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    # Check for GPU availability
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"\n2. Device: {device.upper()}")
    
    # Load sentence transformer model
    print("\n3. Loading sentence-transformers model...")
    print("   Model: sentence-transformers/all-MiniLM-L6-v2")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device=device)
    print(f"   Embedding dimension: {model.get_sentence_embedding_dimension()}")
    
    # Generate embeddings in batches
    print("\n4. Generating embeddings...")
    batch_size = 32
    embeddings = []
    
    # Get embedding texts
    embedding_texts = books_df['embedding_text'].tolist()
    
    # Process in batches with progress bar
    for i in tqdm(range(0, len(embedding_texts), batch_size), desc="   Processing batches"):
        batch = embedding_texts[i:i+batch_size]
        batch_embeddings = model.encode(
            batch,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=False  # We'll normalize later for FAISS
        )
        embeddings.append(batch_embeddings)
    
    # Concatenate all embeddings
    embeddings_array = np.vstack(embeddings)
    print(f"\n   Generated embeddings shape: {embeddings_array.shape}")
    
    # Save embeddings
    print(f"\n5. Saving embeddings to {OUTPUT_FILE}...")
    np.save(OUTPUT_FILE, embeddings_array)
    
    file_size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
    print(f"   Saved successfully!")
    print(f"   File size: {file_size_mb:.2f} MB")
    
    # Verify embeddings
    print("\n6. Verifying embeddings...")
    loaded_embeddings = np.load(OUTPUT_FILE)
    print(f"   Loaded shape: {loaded_embeddings.shape}")
    print(f"   Data type: {loaded_embeddings.dtype}")
    print(f"   Sample embedding (first 5 dims): {loaded_embeddings[0][:5]}")
    
    print("\n" + "=" * 60)
    print("✓ Embedding generation complete!")
    print("=" * 60)
    print(f"\nNext step: Run build_faiss_index.py")

if __name__ == "__main__":
    main()

