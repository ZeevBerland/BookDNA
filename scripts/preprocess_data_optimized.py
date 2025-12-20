"""
BookDNA Data Preprocessing Pipeline (OPTIMIZED VERSION)
Processes books_data.csv and Books_rating.csv to create clean, enriched dataset
10-20x faster than original version using pandas vectorization
"""

import pandas as pd
import numpy as np
import json
import ast
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict

# Create output directory
OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def safe_parse_list(val):
    """Safely parse string representations of lists"""
    if pd.isna(val) or val == '':
        return []
    if isinstance(val, list):
        return val
    try:
        parsed = ast.literal_eval(val)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except:
        return [str(val)]

def clean_text(text):
    """Clean and normalize text"""
    if pd.isna(text) or text == '':
        return ''
    text = str(text).strip()
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def aggregate_reviews_vectorized(reviews_df):
    """
    Vectorized review aggregation - processes all books at once
    Much faster than iterating through books one by one
    """
    print("\n   Computing helpfulness scores...")
    
    # Parse helpfulness column vectorized
    def parse_helpfulness(help_str):
        if pd.isna(help_str) or help_str == '':
            return 0.0
        help_str = str(help_str)
        if '/' in help_str:
            try:
                parts = help_str.split('/')
                helpful = int(parts[0])
                total = int(parts[1])
                return helpful / total if total > 0 else 0.0
            except:
                return 0.0
        return 0.0
    
    # Vectorized helpfulness calculation
    reviews_df['helpfulness_score'] = reviews_df['review/helpfulness'].apply(parse_helpfulness)
    
    print("   Grouping reviews by book...")
    
    # Group by title and aggregate
    aggregated = reviews_df.groupby('Title').agg({
        'review/score': ['count', 'mean'],
        'helpfulness_score': 'max',  # We'll use this to identify top reviews
        'review/summary': lambda x: ' '.join([clean_text(s) for s in x.dropna().head(3)]),
        'review/text': lambda x: ' '.join([clean_text(t)[:200] for t in x.dropna().head(3)])
    })
    
    # Flatten column names
    aggregated.columns = ['review_count', 'avg_score', 'max_helpfulness', 'review_summaries', 'review_texts']
    
    # Combine summaries and texts
    aggregated['review_summary'] = aggregated['review_summaries'] + ' ' + aggregated['review_texts']
    aggregated['review_summary'] = aggregated['review_summary'].str.strip()
    
    # Drop intermediate columns
    aggregated = aggregated.drop(['review_summaries', 'review_texts', 'max_helpfulness'], axis=1)
    
    return aggregated.reset_index()

def main():
    print("=" * 60)
    print("BookDNA Data Preprocessing Pipeline (OPTIMIZED)")
    print("=" * 60)
    
    # Load books data
    print("\n1. Loading books_data.csv...")
    books_df = pd.read_csv('data/books_data.csv')
    print(f"   Loaded {len(books_df):,} books")
    
    # Load reviews data in chunks (large file)
    print("\n2. Loading Books_rating.csv in chunks...")
    chunk_size = 100000
    reviews_chunks = []
    total_reviews = 0
    
    try:
        for chunk in tqdm(pd.read_csv('data/Books_rating.csv', chunksize=chunk_size), desc="   Reading chunks"):
            reviews_chunks.append(chunk)
            total_reviews += len(chunk)
        
        reviews_df = pd.concat(reviews_chunks, ignore_index=True)
        print(f"   Loaded {total_reviews:,} reviews")
    except Exception as e:
        print(f"   Warning: Could not load reviews file: {e}")
        print("   Continuing without reviews data...")
        reviews_df = pd.DataFrame()
    
    # Clean books data
    print("\n3. Cleaning books data...")
    
    # Parse authors and categories
    print("   Parsing authors and categories...")
    books_df['authors_parsed'] = books_df['authors'].apply(safe_parse_list)
    books_df['categories_parsed'] = books_df['categories'].apply(safe_parse_list)
    
    # Clean text fields
    print("   Cleaning text fields...")
    books_df['title_clean'] = books_df['Title'].apply(clean_text)
    books_df['description_clean'] = books_df['description'].apply(clean_text)
    
    # Fill missing descriptions
    books_df['description_clean'] = books_df['description_clean'].fillna('')
    
    # Aggregate reviews per book (OPTIMIZED - all at once!)
    print("\n4. Aggregating reviews per book (vectorized)...")
    
    if not reviews_df.empty:
        # Vectorized aggregation - much faster!
        review_aggregated = aggregate_reviews_vectorized(reviews_df)
        
        # Merge with books data
        print("   Merging review data with books...")
        books_df = books_df.merge(
            review_aggregated,
            left_on='Title',
            right_on='Title',
            how='left'
        )
        
        # Fill missing review data
        books_df['review_count'] = books_df['review_count'].fillna(0).astype(int)
        books_df['avg_score'] = books_df['avg_score'].fillna(0.0)
        books_df['review_summary'] = books_df['review_summary'].fillna('')
    else:
        books_df['review_count'] = 0
        books_df['avg_score'] = 0.0
        books_df['review_summary'] = ''
    
    print(f"   ✓ Aggregation complete!")
    
    # Create rich embedding_text field
    print("\n5. Creating embedding_text field...")
    
    def create_embedding_text(row):
        parts = []
        
        # Title (2x weight)
        if row['title_clean']:
            parts.extend([row['title_clean']] * 2)
        
        # Description (3x weight)
        if row['description_clean']:
            parts.extend([row['description_clean']] * 3)
        
        # Authors
        if row['authors_parsed']:
            parts.append(' '.join(row['authors_parsed']))
        
        # Categories
        if row['categories_parsed']:
            parts.append(' '.join(row['categories_parsed']))
        
        # Review summary (2x weight)
        if row['review_summary']:
            parts.extend([row['review_summary']] * 2)
        
        return ' '.join(parts)
    
    # Vectorized embedding text creation with progress bar
    tqdm.pandas(desc="   Creating embeddings")
    books_df['embedding_text'] = books_df.progress_apply(create_embedding_text, axis=1)
    
    # Filter out books with insufficient data
    print("\n6. Filtering books...")
    print(f"   Before filtering: {len(books_df):,} books")
    
    # Keep books that have at least a title and some description OR reviews
    books_df = books_df[
        (books_df['title_clean'] != '') & 
        ((books_df['description_clean'] != '') | (books_df['review_summary'] != ''))
    ]
    
    print(f"   After filtering: {len(books_df):,} books")
    
    # Create final clean dataset
    print("\n7. Creating final dataset...")
    
    final_df = pd.DataFrame({
        'id': range(len(books_df)),
        'title': books_df['title_clean'].values,
        'description': books_df['description_clean'].values,
        'authors': books_df['authors_parsed'].apply(json.dumps).values,
        'categories': books_df['categories_parsed'].apply(json.dumps).values,
        'image_url': books_df['image'].values,
        'preview_link': books_df['previewLink'].values,
        'info_link': books_df['infoLink'].values,
        'publisher': books_df['publisher'].fillna('').values,
        'published_date': books_df['publishedDate'].fillna('').values,
        'ratings_count': books_df['ratingsCount'].fillna(0).values,
        'review_count': books_df['review_count'].values,
        'avg_rating': books_df['avg_score'].values,
        'embedding_text': books_df['embedding_text'].values
    })
    
    # Save to CSV
    output_path = OUTPUT_DIR / 'books_clean.csv'
    print(f"\n   Saving to: {output_path}")
    final_df.to_csv(output_path, index=False)
    print(f"   File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
    
    # Print statistics
    print("\n" + "=" * 60)
    print("Statistics:")
    print("=" * 60)
    print(f"Total books: {len(final_df):,}")
    print(f"Books with descriptions: {(final_df['description'] != '').sum():,}")
    print(f"Books with reviews: {(final_df['review_count'] > 0).sum():,}")
    print(f"Average reviews per book: {final_df['review_count'].mean():.2f}")
    print(f"Books with images: {final_df['image_url'].notna().sum():,}")
    
    # Category statistics
    all_categories = defaultdict(int)
    for cats_json in final_df['categories']:
        for cat in json.loads(cats_json):
            all_categories[cat] += 1
    
    print(f"Unique categories: {len(all_categories)}")
    print("\nTop 10 categories:")
    for cat, count in sorted(all_categories.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  - {cat}: {count:,}")
    
    print("\n" + "=" * 60)
    print("✓ Preprocessing complete!")
    print("=" * 60)
    print(f"\nProcessed {len(final_df):,} books successfully!")
    print("Next step: Run generate_embeddings.py")

if __name__ == "__main__":
    main()

