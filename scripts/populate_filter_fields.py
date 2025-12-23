"""
Populate missing filter fields for Phase 2 features:
- published_year (extracted from published_date)
- page_count (estimated based on category averages)
- reading_level (calculated based on categories)
"""

import os
import re
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

# Load environment variables
load_dotenv('.env.local')

# Initialize Supabase client
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env.local")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Category-based reading level mapping
BEGINNER_CATEGORIES = [
    'Children', 'Juvenile Fiction', 'Young Adult', 'Picture Books',
    'Easy Reader', 'Board Books', 'Beginning Readers'
]

ADVANCED_CATEGORIES = [
    'Philosophy', 'Science', 'Mathematics', 'Medical', 'Law',
    'Academic', 'Technical', 'Research', 'Textbooks', 'Scholarly'
]

# Average page counts by category (approximations)
CATEGORY_PAGE_COUNTS = {
    'Children': 32,
    'Picture Books': 32,
    'Board Books': 24,
    'Juvenile Fiction': 250,
    'Young Adult': 350,
    'Romance': 350,
    'Mystery': 320,
    'Thriller': 380,
    'Science Fiction': 400,
    'Fantasy': 450,
    'Historical Fiction': 420,
    'Literary Fiction': 350,
    'Biography': 400,
    'History': 450,
    'Science': 350,
    'Philosophy': 300,
    'Self-Help': 280,
    'Business': 300,
    'Cooking': 250,
    'Poetry': 150,
    'Short Stories': 250,
}

DEFAULT_PAGE_COUNT = 320  # Default for books without matching categories

def extract_year(published_date):
    """Extract year from published_date string"""
    if not published_date or not isinstance(published_date, str):
        return None
    
    # Try to extract 4-digit year
    match = re.search(r'\b(1[89]\d{2}|20\d{2})\b', published_date)
    if match:
        year = int(match.group(1))
        # Sanity check: only accept years between 1800 and 2030
        if 1800 <= year <= 2030:
            return year
    
    return None

def determine_reading_level(categories):
    """Determine reading level based on categories"""
    if not categories or not isinstance(categories, list):
        return 'intermediate'  # Default
    
    categories_str = ' '.join(str(cat) for cat in categories).lower()
    
    # Check for beginner indicators
    for beginner_cat in BEGINNER_CATEGORIES:
        if beginner_cat.lower() in categories_str:
            return 'beginner'
    
    # Check for advanced indicators
    for advanced_cat in ADVANCED_CATEGORIES:
        if advanced_cat.lower() in categories_str:
            return 'advanced'
    
    return 'intermediate'

def estimate_page_count(categories):
    """Estimate page count based on categories"""
    if not categories or not isinstance(categories, list):
        return DEFAULT_PAGE_COUNT
    
    # Find matching category and return its average page count
    for category in categories:
        if not isinstance(category, str):
            continue
        
        # Check for exact or partial matches
        for cat_key, page_count in CATEGORY_PAGE_COUNTS.items():
            if cat_key.lower() in category.lower():
                return page_count
    
    return DEFAULT_PAGE_COUNT

def update_books_in_batches(batch_size=500):
    """Update books in batches to populate filter fields"""
    
    print("Fetching books from database...")
    
    # Fetch books that need updates (in batches)
    offset = 0
    total_updated = 0
    
    while True:
        # Fetch batch of books
        response = supabase.table('books')\
            .select('id, published_date, categories')\
            .is_('published_year', 'null')\
            .range(offset, offset + batch_size - 1)\
            .execute()
        
        books = response.data
        
        if not books or len(books) == 0:
            break
        
        print(f"\nProcessing batch starting at offset {offset} ({len(books)} books)...")
        
        # Prepare updates
        updates = []
        for book in tqdm(books, desc="Preparing updates"):
            book_id = book['id']
            published_date = book.get('published_date')
            categories = book.get('categories', [])
            
            # Calculate new field values
            published_year = extract_year(published_date)
            reading_level = determine_reading_level(categories)
            page_count = estimate_page_count(categories)
            
            # Only update if we have at least published_year
            if published_year:
                updates.append({
                    'id': book_id,
                    'published_year': published_year,
                    'reading_level': reading_level,
                    'page_count': page_count
                })
        
        # Batch update
        if updates:
            print(f"Updating {len(updates)} books in database...")
            for update in tqdm(updates, desc="Updating"):
                try:
                    supabase.table('books')\
                        .update({
                            'published_year': update['published_year'],
                            'reading_level': update['reading_level'],
                            'page_count': update['page_count']
                        })\
                        .eq('id', update['id'])\
                        .execute()
                    total_updated += 1
                except Exception as e:
                    print(f"Error updating book {update['id']}: {e}")
        
        offset += batch_size
        
        # Break if we got fewer books than batch_size (last batch)
        if len(books) < batch_size:
            break
    
    print(f"\n✅ Successfully updated {total_updated} books!")
    return total_updated

if __name__ == '__main__':
    print("=" * 80)
    print("Phase 2: Populating Filter Fields".center(80))
    print("=" * 80)
    print("\nThis script will:")
    print("- Extract publication year from published_date")
    print("- Estimate page count based on categories")
    print("- Calculate reading level based on categories")
    print("\nProcessing books in batches...")
    print("=" * 80)
    
    try:
        total = update_books_in_batches(batch_size=500)
        print("\n" + "=" * 80)
        print(f"✅ Completed! Updated {total} books.".center(80))
        print("=" * 80)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise

