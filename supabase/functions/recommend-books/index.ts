// BookDNA Book Recommendations Edge Function
// Returns similar books using vector similarity

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecommendRequest {
  book_id: number;
  limit?: number;
  same_genre?: boolean;  // Optional: only recommend books from same genres
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { book_id, limit = 10, same_genre = false }: RecommendRequest =
      await req.json();

    if (!book_id) {
      return new Response(
        JSON.stringify({ error: "book_id parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Getting recommendations for book ${book_id}, limit: ${limit}`);

    // Step 1: Fetch the source book with its embedding
    const { data: sourceBook, error: sourceError } = await supabase
      .from("books")
      .select("id, embedding, categories, title")
      .eq("id", book_id)
      .single();

    if (sourceError || !sourceBook) {
      return new Response(
        JSON.stringify({ error: "Book not found or has no embedding" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!sourceBook.embedding) {
      return new Response(
        JSON.stringify({ error: "Source book has no embedding" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare embedding string for RPC call
    // Handle both array and string formats
    let embeddingStr: string;
    if (Array.isArray(sourceBook.embedding)) {
      embeddingStr = `[${sourceBook.embedding.join(",")}]`;
    } else if (typeof sourceBook.embedding === 'string') {
      // Already a string, might need formatting
      embeddingStr = sourceBook.embedding.startsWith('[') 
        ? sourceBook.embedding 
        : `[${sourceBook.embedding}]`;
    } else {
      // Assume it's already in the right format
      embeddingStr = String(sourceBook.embedding);
    }

    console.log(`Source book ${book_id} embedding type: ${typeof sourceBook.embedding}`);

    // Step 2: Use RPC function for vector similarity (most reliable approach)
    const { data: books, error: booksError } = await supabase.rpc(
      'find_similar_books',
      {
        source_embedding: embeddingStr,
        source_book_id: book_id,
        match_limit: limit,
        same_genre_only: same_genre,
        source_categories: same_genre ? sourceBook.categories : null
      }
    );

    if (booksError) {
      console.error("Error finding similar books:", booksError);
      throw new Error(`Database error: ${booksError.message}`);
    }

    console.log(`Returning ${books?.length || 0} recommendations`);

    return new Response(
      JSON.stringify({
        source_book: {
          id: sourceBook.id,
          title: sourceBook.title,
        },
        recommendations: books || [],
        total: books?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in recommend-books:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

