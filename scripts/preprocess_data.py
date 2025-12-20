"""
BookDNA Data Preprocessing Pipeline
Processes books_data.csv and Books_rating.csv to create clean, enriched dataset
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

def aggregate_reviews(reviews_df, title):
    """Aggregate reviews for a single book"""
    book_reviews = reviews_df[reviews_df['Title'] == title].copy()
    
    if len(book_reviews) == 0:
        return {
            'review_count': 0,
            'avg_score': 0.0,
            'review_summary': '',
            'top_reviews': []
        }
    
    # Calculate average score
    avg_score = book_reviews['review/score'].mean()
    
    # Get top helpful reviews (up to 3)
    book_reviews['helpfulness_score'] = 0.0  # Initialize as float
    for idx, row in book_reviews.iterrows():
        help_str = str(row['review/helpfulness'])
        if '/' in help_str:
            try:
                parts = help_str.split('/')
                helpful = int(parts[0])
                total = int(parts[1])
                if total > 0:
                    book_reviews.loc[idx, 'helpfulness_score'] = float(helpful / total)
            except:
                pass
    
    top_reviews = book_reviews.nlargest(3, 'helpfulness_score')
    
    # Combine review summaries and text
    review_texts = []
    for _, review in top_reviews.iterrows():
        summary = clean_text(review['review/summary'])
        text = clean_text(review['review/text'])
        if summary:
            review_texts.append(summary)
        if text and len(text) < 500:  # Only include shorter reviews
            review_texts.append(text[:200])  # Truncate long reviews
    
    return {
        'review_count': len(book_reviews),
        'avg_score': float(avg_score),
        'review_summary': ' '.join(review_texts[:5]),  # Top 5 snippets
        'top_reviews': review_texts[:3]
    }

def main():
    print("=" * 60)
    print("BookDNA Data Preprocessing Pipeline")
    print("=" * 60)
    
    # Load books data
    print("\n1. Loading books_data.csv...")
    books_df = pd.read_csv('data/books_data.csv')
    print(f"   Loaded {len(books_df):,} books")
    
    # Load reviews data in chunks (large file)
    print("\n2. Loading Books_rating.csv in chunks...")
    chunk_size = 50000
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
    books_df['authors_parsed'] = books_df['authors'].apply(safe_parse_list)
    books_df['categories_parsed'] = books_df['categories'].apply(safe_parse_list)
    
    # Clean text fields
    books_df['title_clean'] = books_df['Title'].apply(clean_text)
    books_df['description_clean'] = books_df['description'].apply(clean_text)
    
    # Fill missing descriptions
    books_df['description_clean'] = books_df['description_clean'].fillna('')
    
    # Aggregate reviews per book
    print("\n4. Aggregating reviews per book...")
    review_data = []
    
    if not reviews_df.empty:
        # Get unique titles from books that have reviews
        reviewed_titles = set(reviews_df['Title'].unique())
        
        for title in tqdm(books_df['Title'], desc="   Processing"):
            if title in reviewed_titles:
                agg = aggregate_reviews(reviews_df, title)
            else:
                agg = {
                    'review_count': 0,
                    'avg_score': 0.0,
                    'review_summary': '',
                    'top_reviews': []
                }
            review_data.append(agg)
    else:
        review_data = [{
            'review_count': 0,
            'avg_score': 0.0,
            'review_summary': '',
            'top_reviews': []
        } for _ in range(len(books_df))]
    
    # Add review data to dataframe
    books_df['review_count'] = [r['review_count'] for r in review_data]
    books_df['avg_score'] = [r['avg_score'] for r in review_data]
    books_df['review_summary'] = [r['review_summary'] for r in review_data]
    
    # Create rich embedding_text field
    print("\n5. Creating embedding_text field...")
    
    def create_embedding_text(row):
        parts = []
        
        # Title (2x weight)
        if row['title_clean']:
            parts.append(row['title_clean'])
            parts.append(row['title_clean'])
        
        # Description (3x weight)
        if row['description_clean']:
            parts.append(row['description_clean'])
            parts.append(row['description_clean'])
            parts.append(row['description_clean'])
        
        # Authors
        if row['authors_parsed']:
            parts.append(' '.join(row['authors_parsed']))
        
        # Categories
        if row['categories_parsed']:
            parts.append(' '.join(row['categories_parsed']))
        
        # Review summary (2x weight)
        if row['review_summary']:
            parts.append(row['review_summary'])
            parts.append(row['review_summary'])
        
        return ' '.join(parts)
    
    books_df['embedding_text'] = books_df.apply(create_embedding_text, axis=1)
    
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
    final_df.to_csv(output_path, index=False)
    print(f"\n   Saved to: {output_path}")
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
    print(f"Unique categories: {len(set([cat for cats in final_df['categories'] for cat in json.loads(cats)]))}")
    print("\nTop 10 categories:")
    all_categories = defaultdict(int)
    for cats_json in final_df['categories']:
        for cat in json.loads(cats_json):
            all_categories[cat] += 1
    
    for cat, count in sorted(all_categories.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  - {cat}: {count:,}")
    
    print("\n" + "=" * 60)
    print("✓ Preprocessing complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

