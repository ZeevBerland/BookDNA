import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const title = searchParams.get('title');
  const author = searchParams.get('author');
  const isbn = searchParams.get('isbn');

  if (!bookId || !title || !author) {
    return Response.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Check cache first
  const { data: cached, error: cacheError } = await supabase
    .from('book_prices')
    .select('*')
    .eq('book_id', bookId)
    .single();

  if (cached && !cacheError) {
    console.log(`Cache HIT for book ${bookId}`);
    return Response.json({
      prices: cached.prices,
      summary: cached.summary,
      sources: cached.sources,
      cached: true,
      lastFetched: cached.last_fetched
    });
  }

  // 2. Cache miss - fetch from Gemini
  console.log(`Cache MISS for book ${bookId} - fetching from Gemini`);
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-book-prices`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, author, isbn: isbn || null })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      throw new Error(`Failed to fetch prices from Edge Function: ${response.status} ${errorText}`);
    }

    const priceData = await response.json();

    // 3. Save to cache
    await supabase
      .from('book_prices')
      .insert({
        book_id: parseInt(bookId),
        isbn: isbn || null,
        prices: priceData.prices,
        summary: priceData.summary,
        sources: priceData.sources || [],
        last_fetched: new Date().toISOString()
      });

    console.log(`Cached prices for book ${bookId}`);

    return Response.json({
      prices: priceData.prices,
      summary: priceData.summary,
      sources: priceData.sources,
      cached: false,
      lastFetched: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching prices:', error);
    return Response.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}

