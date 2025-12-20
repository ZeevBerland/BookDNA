"""
Fast embedding upload using direct PostgreSQL connection and COPY
This is the fastest method - should take 2-3 minutes instead of hours
"""

import numpy as np
import pandas as pd
from pathlib import Path
import os
from tqdm import tqdm
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values
import io

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

# Paths
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
BOOKS_FILE = Path("data/processed/books_clean.csv")

# Get Supabase connection details
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")  # You'll need to add this

def get_db_connection_string():
    """Extract database connection details from Supabase URL"""
    if not SUPABASE_URL:
        return None
    
    # Supabase URL format: https://PROJECT_ID.supabase.co
    project_id = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")
    
    # Try connection pooler first (works better with external connections)
    # Format: aws-0-us-east-1.pooler.supabase.com
    # But we'll use the direct connection: db.PROJECT_ID.supabase.co
    
    # For Supabase projects, try multiple hostname formats
    possible_hosts = [
        f"db.{project_id}.supabase.co",  # Direct connection
        f"aws-0-us-east-1.pooler.supabase.com",  # Pooler (US East)
    ]
    
    return {
        'hosts': possible_hosts,
        'project_id': project_id,
        'port': 6543,  # Connection pooler port (use 5432 for direct)
        'database': 'postgres',
        'user': 'postgres.{}'.format(project_id),  # Pooler format
        'password': SUPABASE_DB_PASSWORD
    }

def main():
    print("=" * 60)
    print("Fast Embedding Upload (Direct PostgreSQL)")
    print("=" * 60)
    
    # Check credentials
    db_config = get_db_connection_string()
    if not db_config or not db_config['password']:
        print("\n❌ Error: Database password not found!")
        print("\nPlease add SUPABASE_DB_PASSWORD to your .env.local file")
        print("You can find it in: Supabase Dashboard > Settings > Database > Connection string")
        return
    
    print("\n1. Loading embeddings...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings ({embeddings.shape[1]} dims)")
    
    print("\n2. Loading books...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    print("\n3. Connecting to PostgreSQL...")
    
    project_id = db_config['project_id']
    
    # Try different connection methods
    connection_attempts = [
        {
            'host': f'db.{project_id}.supabase.co',
            'port': 5432,
            'user': 'postgres',
            'database': 'postgres',
            'password': db_config['password']
        },
        {
            'host': f'aws-0-us-east-1.pooler.supabase.com',
            'port': 6543,
            'user': f'postgres.{project_id}',
            'database': 'postgres',
            'password': db_config['password']
        }
    ]
    
    conn = None
    for i, config in enumerate(connection_attempts):
        try:
            print(f"   Trying connection method {i+1}...")
            conn = psycopg2.connect(**config)
            cursor = conn.cursor()
            print(f"   ✓ Connected to database via {config['host']}")
            break
        except Exception as e:
            print(f"   ⚠️  Failed: {str(e)[:60]}")
            if i == len(connection_attempts) - 1:
                print(f"\n   ❌ All connection attempts failed")
                print("\nPlease use the connection string from Supabase Dashboard:")
                print("Settings > Database > Connection string")
                print("\nOr enable external connections:")
                print("Settings > Database > Disable 'SSL enforcement' temporarily")
                return
            continue
    
    print("\n4. Uploading embeddings (fast bulk operation)...")
    print("   This should take 2-3 minutes...")
    
    try:
        # Prepare data for bulk update
        batch_size = 1000
        total_updated = 0
        
        for i in tqdm(range(0, len(books_df), batch_size), desc="   Processing"):
            batch = books_df.iloc[i:i+batch_size]
            
            # Prepare update values
            update_data = []
            for _, row in batch.iterrows():
                book_id = int(row['id'])
                embedding = embeddings[book_id].tolist()
                # Format: (faiss_index, embedding_array)
                update_data.append((book_id, embedding))
            
            # Use execute_values for fast batch update
            # Create temp table approach for bulk update
            query = """
                UPDATE books 
                SET embedding = data.emb::vector
                FROM (VALUES %s) AS data(idx, emb)
                WHERE books.faiss_index = data.idx
            """
            
            try:
                execute_values(
                    cursor,
                    query,
                    [(idx, f'[{",".join(map(str, emb))}]') for idx, emb in update_data],
                    template='(%s, %s)',
                    page_size=100
                )
                conn.commit()
                total_updated += len(update_data)
            except Exception as e:
                print(f"\n   ⚠️  Batch error: {str(e)[:100]}")
                conn.rollback()
                continue
        
        print(f"\n   ✓ Successfully updated {total_updated:,} books!")
        
    except Exception as e:
        print(f"\n   ❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
    
    print("\n" + "=" * 60)
    print("✓ Upload complete!")
    print("=" * 60)
    
    print("\nNext steps:")
    print("1. Set Hugging Face API key")
    print("2. Deploy updated Edge Function")
    print("3. Test the app!")

if __name__ == "__main__":
    main()

