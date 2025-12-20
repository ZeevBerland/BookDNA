"""
BookDNA Supabase Upload (Improved Version)
Uploads processed books data and FAISS index to Supabase with better error handling
"""

import pandas as pd
import json
from pathlib import Path
from supabase import create_client, Client
import os
from tqdm import tqdm
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()
load_dotenv('.env.local')  # Also load from .env.local

# Paths
BOOKS_FILE = Path("data/processed/books_clean.csv")
INDEX_FILE = Path("data/processed/books_faiss.index")
METADATA_FILE = Path("data/processed/books_metadata.json")

# Supabase credentials - try multiple env var names
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def main():
    print("=" * 60)
    print("BookDNA Supabase Upload (Improved)")
    print("=" * 60)
    
    # Check credentials
    print("\n1. Checking credentials...")
    print(f"   SUPABASE_URL: {SUPABASE_URL[:30]}..." if SUPABASE_URL else "   SUPABASE_URL: NOT FOUND")
    print(f"   SUPABASE_KEY: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "   SUPABASE_KEY: NOT FOUND")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        print("   Please set credentials in .env or .env.local file:")
        print("   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
        print("   - SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")
        return
    
    # Initialize Supabase client
    print("\n2. Connecting to Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("   ✓ Connected")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    # Load books data
    print(f"\n3. Loading books data from {BOOKS_FILE}...")
    if not BOOKS_FILE.exists():
        print(f"   ❌ File not found: {BOOKS_FILE}")
        return
    
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    # Upload books to database
    print("\n4. Uploading books to database...")
    print("   Using smaller batches (50) to avoid timeouts...")
    
    batch_size = 50  # Smaller batch size
    total_uploaded = 0
    failed_batches = []
    
    for i in tqdm(range(0, len(books_df), batch_size), desc="   Uploading"):
        batch = books_df.iloc[i:i+batch_size]
        
        # Prepare batch data
        records = []
        for idx, row in batch.iterrows():
            try:
                records.append({
                    'title': str(row['title'])[:500],  # Limit string length
                    'description': str(row['description'])[:2000] if pd.notna(row['description']) else '',
                    'authors': json.loads(row['authors']) if pd.notna(row['authors']) else [],
                    'categories': json.loads(row['categories']) if pd.notna(row['categories']) else [],
                    'image_url': str(row['image_url']) if pd.notna(row['image_url']) else None,
                    'preview_link': str(row['preview_link']) if pd.notna(row['preview_link']) else None,
                    'publisher': str(row['publisher'])[:200] if pd.notna(row['publisher']) else '',
                    'published_date': str(row['published_date'])[:50] if pd.notna(row['published_date']) else '',
                    'ratings_count': int(row['ratings_count']) if pd.notna(row['ratings_count']) else 0,
                    'avg_rating': float(row['avg_rating']) if pd.notna(row['avg_rating']) else 0.0,
                    'faiss_index': int(row['id'])
                })
            except Exception as e:
                print(f"\n   ⚠️  Error preparing record at index {idx}: {e}")
                continue
        
        # Upload batch with retry
        max_retries = 3
        for retry in range(max_retries):
            try:
                result = supabase.table('books').insert(records).execute()
                total_uploaded += len(records)
                break
            except Exception as e:
                if retry < max_retries - 1:
                    print(f"\n   ⚠️  Retry {retry + 1}/{max_retries} for batch {i//batch_size + 1}")
                    time.sleep(2)  # Wait before retry
                else:
                    print(f"\n   ❌ Failed batch {i//batch_size + 1} after {max_retries} retries")
                    print(f"      Error: {str(e)[:200]}")
                    failed_batches.append(i//batch_size + 1)
    
    print(f"\n   ✓ Uploaded {total_uploaded:,} books successfully")
    if failed_batches:
        print(f"   ⚠️  Failed batches: {failed_batches}")
    
    # Create storage bucket first if needed
    print("\n5. Checking/creating storage bucket...")
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if 'indexes' not in bucket_names:
            print("   Creating 'indexes' bucket...")
            supabase.storage.create_bucket('indexes', {'public': False})
            print("   ✓ Bucket created")
        else:
            print("   ✓ Bucket 'indexes' already exists")
    except Exception as e:
        print(f"   ⚠️  Note: {e}")
        print("   You may need to create the bucket manually in Supabase dashboard")
    
    # Upload FAISS index to storage
    print("\n6. Uploading FAISS index to Supabase Storage...")
    
    if INDEX_FILE.exists():
        try:
            print(f"   Reading {INDEX_FILE.stat().st_size / 1024 / 1024:.2f} MB file...")
            with open(INDEX_FILE, 'rb') as f:
                index_data = f.read()
            
            print("   Uploading to storage...")
            # Try to remove existing file first
            try:
                supabase.storage.from_('indexes').remove(['books_faiss.index'])
            except:
                pass
            
            result = supabase.storage.from_('indexes').upload(
                'books_faiss.index',
                index_data,
                {'content-type': 'application/octet-stream', 'upsert': 'true'}
            )
            
            file_size_mb = len(index_data) / 1024 / 1024
            print(f"   ✓ Uploaded FAISS index ({file_size_mb:.2f} MB)")
        except Exception as e:
            print(f"   ❌ Error uploading index: {e}")
    else:
        print(f"   ⚠️  Index file not found: {INDEX_FILE}")
    
    # Upload metadata
    print("\n7. Uploading metadata to storage...")
    
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata_data = f.read()
            
            # Try to remove existing file first
            try:
                supabase.storage.from_('indexes').remove(['books_metadata.json'])
            except:
                pass
            
            result = supabase.storage.from_('indexes').upload(
                'books_metadata.json',
                metadata_data.encode('utf-8'),
                {'content-type': 'application/json', 'upsert': 'true'}
            )
            
            print(f"   ✓ Uploaded metadata")
        except Exception as e:
            print(f"   ❌ Error uploading metadata: {e}")
    
    print("\n" + "=" * 60)
    print("✓ Upload complete!")
    print("=" * 60)
    
    print(f"\nSummary:")
    print(f"  - Books uploaded: {total_uploaded:,}")
    print(f"  - Failed batches: {len(failed_batches)}")
    print(f"  - FAISS index: {'✓' if INDEX_FILE.exists() else '❌'}")
    print(f"  - Metadata: {'✓' if METADATA_FILE.exists() else '❌'}")
    
    print("\nNext steps:")
    print("1. Deploy Supabase Edge Function: npx supabase functions deploy semantic-search")
    print("2. Test the search in your app!")

if __name__ == "__main__":
    main()

