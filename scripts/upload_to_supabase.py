"""
BookDNA Supabase Upload
Uploads processed books data and FAISS index to Supabase
"""

import pandas as pd
import json
from pathlib import Path
from supabase import create_client, Client
import os
from tqdm import tqdm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Paths
BOOKS_FILE = Path("data/processed/books_clean.csv")
INDEX_FILE = Path("data/processed/books_faiss.index")
METADATA_FILE = Path("data/processed/books_metadata.json")

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for uploads

def main():
    print("=" * 60)
    print("BookDNA Supabase Upload")
    print("=" * 60)
    
    # Check credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        print("   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
        return
    
    # Initialize Supabase client
    print("\n1. Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✓ Connected")
    
    # Load books data
    print(f"\n2. Loading books data from {BOOKS_FILE}...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    # Upload books to database
    print("\n3. Uploading books to database...")
    print("   This may take a while...")
    
    batch_size = 100
    total_uploaded = 0
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Uploading batches"):
        batch = books_df.iloc[i:i+batch_size]
        
        # Prepare batch data
        records = []
        for idx, row in batch.iterrows():
            records.append({
                'title': row['title'],
                'description': row['description'],
                'authors': json.loads(row['authors']),
                'categories': json.loads(row['categories']),
                'image_url': row['image_url'],
                'preview_link': row['preview_link'],
                'publisher': row['publisher'],
                'published_date': row['published_date'],
                'ratings_count': int(row['ratings_count']) if not pd.isna(row['ratings_count']) else 0,
                'avg_rating': float(row['avg_rating']) if not pd.isna(row['avg_rating']) else 0.0,
                'faiss_index': int(row['id'])
            })
        
        # Upload batch
        try:
            result = supabase.table('books').insert(records).execute()
            total_uploaded += len(records)
        except Exception as e:
            print(f"\n   ⚠️  Error uploading batch {i//batch_size + 1}: {e}")
            # Continue with next batch
    
    print(f"\n   ✓ Uploaded {total_uploaded:,} books")
    
    # Upload FAISS index to storage
    print("\n4. Uploading FAISS index to Supabase Storage...")
    
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, 'rb') as f:
                index_data = f.read()
            
            # Upload to storage bucket
            result = supabase.storage.from_('indexes').upload(
                'books_faiss.index',
                index_data,
                {'content-type': 'application/octet-stream'}
            )
            
            file_size_mb = len(index_data) / 1024 / 1024
            print(f"   ✓ Uploaded FAISS index ({file_size_mb:.2f} MB)")
        except Exception as e:
            print(f"   ⚠️  Error uploading index: {e}")
            print("   Note: You may need to create the 'indexes' bucket first in Supabase dashboard")
    else:
        print(f"   ⚠️  Index file not found: {INDEX_FILE}")
    
    # Upload metadata
    print("\n5. Uploading metadata to storage...")
    
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata_data = f.read()
            
            result = supabase.storage.from_('indexes').upload(
                'books_metadata.json',
                metadata_data.encode('utf-8'),
                {'content-type': 'application/json'}
            )
            
            print(f"   ✓ Uploaded metadata")
        except Exception as e:
            print(f"   ⚠️  Error uploading metadata: {e}")
    
    print("\n" + "=" * 60)
    print("✓ Upload complete!")
    print("=" * 60)
    
    print("\nNext steps:")
    print("1. Deploy Supabase Edge Function for search")
    print("2. Set up Next.js frontend")

if __name__ == "__main__":
    main()

