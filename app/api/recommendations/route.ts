import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const limit = searchParams.get('limit') || '10';
  const sameGenre = searchParams.get('sameGenre') === 'true';

  if (!bookId) {
    return Response.json(
      { error: 'bookId parameter is required' },
      { status: 400 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Call the recommend-books Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/recommend-books`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          book_id: parseInt(bookId),
          limit: parseInt(limit),
          same_genre: sameGenre
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge function error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch recommendations: ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      source_book: data.source_book,
      recommendations: data.recommendations,
      total: data.total
    });

  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return Response.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

