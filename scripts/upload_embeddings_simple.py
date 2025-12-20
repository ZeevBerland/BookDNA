"""
Simple embedding upload using connection string
"""

import numpy as np
import pandas as pd
from pathlib import Path
import os
from tqdm import tqdm
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# Load environment variables
from pathlib import Path as EnvPath
env_local = EnvPath('.env.local')
if env_local.exists():
    load_dotenv('.env.local', override=True)
else:
    load_dotenv()

# Paths
EMBEDDINGS_FILE = Path("data/processed/embeddings.npy")
BOOKS_FILE = Path("data/processed/books_clean.csv")

# Get connection string directly from env
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    print("=" * 60)
    print("Fast Embedding Upload")
    print("=" * 60)
    
    if not DATABASE_URL:
        print("\n❌ Error: DATABASE_URL not found!")
        print("\nPlease add to .env.local:")
        print("DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres")
        print("\nGet it from: Supabase Dashboard > Settings > Database > Connection string")
        print("(Use the 'Connection string' tab, not 'Connection pooling')")
        return
    
    print("\n1. Loading embeddings...")
    embeddings = np.load(EMBEDDINGS_FILE)
    print(f"   Loaded {embeddings.shape[0]:,} embeddings")
    
    print("\n2. Loading books...")
    books_df = pd.read_csv(BOOKS_FILE)
    print(f"   Loaded {len(books_df):,} books")
    
    print("\n3. Connecting to database...")
    
    # Try multiple connection methods
    connection_strings = [
        DATABASE_URL,  # Direct connection
        # Also try pooler as fallback
        DATABASE_URL.replace('db.vmfejgecrmgzjyhtzzeh.supabase.co:5432', 
                           'aws-0-us-east-1.pooler.supabase.com:6543')
                    .replace('postgres:Vladikopp66exl', 
                           'postgres.vmfejgecrmgzjyhtzzeh:Vladikopp66exl')
    ]
    
    conn = None
    for i, conn_str in enumerate(connection_strings):
        try:
            print(f"   Attempting connection method {i+1}...")
            conn = psycopg2.connect(conn_str)
            cursor = conn.cursor()
            print("   ✓ Connected!")
            break
        except Exception as e:
            print(f"   ⚠️  Failed: {str(e)[:80]}")
            if i == len(connection_strings) - 1:
                print("\n   ❌ All connection attempts failed!")
                print("\nPossible issues:")
                print("1. DNS/Network issue - try restarting your network")
                print("2. Firewall blocking connection")
                print("3. Try enabling IPv4 pooling in Supabase Dashboard")
                print("4. Or use Supabase API instead (next step)")
                return
            continue
    
    print("\n4. Uploading embeddings...")
    print("   Using fast batch updates (should take 2-3 minutes)...")
    
    try:
        batch_size = 500
        total_updated = 0
        
        for i in tqdm(range(0, len(books_df), batch_size), desc="   Progress"):
            batch = books_df.iloc[i:i+batch_size]
            
            # Prepare batch data
            update_data = []
            for _, row in batch.iterrows():
                book_id = int(row['id'])
                embedding = embeddings[book_id]
                # Convert to string format for pgvector
                emb_str = f"[{','.join(map(str, embedding))}]"
                update_data.append((emb_str, book_id))
            
            # Bulk update using CASE WHEN for speed
            if update_data:
                try:
                    # Use execute_values for batch update
                    query = """
                        UPDATE books AS b
                        SET embedding = v.emb::vector
                        FROM (VALUES %s) AS v(emb, idx)
                        WHERE b.faiss_index = v.idx::int
                    """
                    execute_values(cursor, query, update_data, template='(%s, %s)', page_size=100)
                    conn.commit()
                    total_updated += len(update_data)
                except Exception as e:
                    print(f"\n   ⚠️  Batch error: {str(e)[:80]}")
                    conn.rollback()
                    continue
        
        print(f"\n   ✓ Updated {total_updated:,} books!")
        
    except Exception as e:
        print(f"\n   ❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
    
    print("\n" + "=" * 60)
    print("✓ Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

