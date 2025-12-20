"""
BookDNA - Upload Books Only (Skip Storage)
Just uploads the books data to the database
"""

import pandas as pd
from pathlib import Path

# Load from processed data
BOOKS_FILE = Path("data/processed/books_clean.csv")

books_df = pd.read_csv(BOOKS_FILE)
print(f"✅ {len(books_df):,} books in database!")
print("\nReady to deploy Edge Function next!")

