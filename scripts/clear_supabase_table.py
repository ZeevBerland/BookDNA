"""
Clear Books Table in Supabase
Deletes all records from the books table to start fresh
"""

from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def main():
    print("=" * 60)
    print("Clear Supabase Books Table")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Error: Supabase credentials not found!")
        return
    
    print(f"\n⚠️  WARNING: This will delete ALL books from the database!")
    print(f"   Database: {SUPABASE_URL}")
    
    confirm = input("\n   Type 'YES' to confirm: ")
    
    if confirm != 'YES':
        print("\n   Cancelled.")
        return
    
    print("\n1. Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✓ Connected")
    
    print("\n2. Deleting all books...")
    try:
        # Delete all records
        result = supabase.table('books').delete().neq('id', -1).execute()
        print("   ✓ All books deleted!")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print("\n   Trying alternative method (truncate via RPC)...")
        try:
            # Alternative: use SQL truncate
            supabase.rpc('exec_sql', {'sql': 'TRUNCATE TABLE books RESTART IDENTITY CASCADE'}).execute()
            print("   ✓ Table truncated!")
        except Exception as e2:
            print(f"   ❌ Error: {e2}")
            print("\n   You may need to truncate manually in Supabase dashboard:")
            print("   Go to SQL Editor and run: TRUNCATE TABLE books RESTART IDENTITY CASCADE;")
            return
    
    print("\n" + "=" * 60)
    print("✓ Table cleared successfully!")
    print("=" * 60)
    print("\nYou can now run the upload script:")
    print("python scripts/upload_to_supabase_improved.py")

if __name__ == "__main__":
    main()

