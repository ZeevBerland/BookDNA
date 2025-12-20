// BookDNA Semantic Search Edge Function (pgvector version)
// Fast semantic book search using Supabase pgvector extension

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  limit?: number;
  category_filter?: string;
  min_rating?: number;
}

// Enhance query using Gemini to make it more suitable for semantic search
async function enhanceQuery(userQuery: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  
  if (!GEMINI_API_KEY) {
    console.log("Gemini API key not configured, using original query");
    return userQuery;
  }

  try {
    const prompt = `You are a book search query enhancer. Given a user's book search query, expand it with relevant synonyms, themes, and context to improve semantic search results. Keep it concise (max 2-3 sentences).

User query: "${userQuery}"

Enhanced query (return ONLY the enhanced text, no explanation):`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error, using original query");
      return userQuery;
    }

    const data = await response.json();
    const enhancedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (enhancedQuery && enhancedQuery.length > 0 && enhancedQuery.length < 500) {
      console.log(`Enhanced query: "${userQuery}" → "${enhancedQuery}"`);
      return enhancedQuery;
    }
    
    return userQuery;
  } catch (error) {
    console.error("Error enhancing query:", error);
    return userQuery;
  }
}

// Generate embedding using Hugging Face Router API
async function generateEmbedding(text: string): Promise<number[]> {
  const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
  
  if (!HF_API_KEY) {
    throw new Error("Hugging Face API key not configured");
  }

  // Using new HF Router API with feature-extraction pipeline
  // This generates 384-dimensional embeddings (same as training data)
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HF API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  // Response is the embedding array directly
  const embedding = Array.isArray(data) ? data : null;
  
  if (!embedding || embedding.length !== 384) {
    throw new Error(`Invalid embedding response: expected 384 dimensions, got ${embedding?.length || 0}`);
  }
  
  return embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { query, limit = 20, category_filter, min_rating }: SearchRequest =
      await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Search query: "${query}"`);

    // Step 1: Enhance query with Gemini
    const enhancedQuery = await enhanceQuery(query);

    // Generate embedding for enhanced query (with fallback on error)
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(enhancedQuery);
      console.log(`Generated query embedding: ${queryEmbedding.length} dims`);
    } catch (embeddingError) {
      console.error("Failed to generate embedding, falling back to text search:", embeddingError);
      
      // Fallback to simple text search using PostgreSQL full-text search
      // This is much faster than ILIKE as it uses the GIN index
      const searchTerm = query.trim().toLowerCase();
      
      // Use PostgreSQL full-text search (uses the GIN index)
      const { data, error } = await supabase
        .from('books')
        .select(`
          id,
          title,
          description,
          authors,
          categories,
          image_url,
          preview_link,
          publisher,
          published_date,
          ratings_count,
          avg_rating,
          faiss_index
        `)
        .textSearch('title', searchTerm, {
          type: 'websearch',
          config: 'english'
        })
        .order('ratings_count', { ascending: false })
        .limit(limit);

      if (error) {
        // If text search fails, return most popular books as fallback
        console.error("Text search failed, returning popular books:", error);
        const fallbackResult = await supabase
          .from('books')
          .select(`
            id,
            title,
            description,
            authors,
            categories,
            image_url,
            preview_link,
            publisher,
            published_date,
            ratings_count,
            avg_rating,
            faiss_index
          `)
          .order('ratings_count', { ascending: false })
          .limit(limit);
        
        if (fallbackResult.error) throw fallbackResult.error;
        
        const books = fallbackResult.data?.map((book: any) => ({
          ...book,
          similarity_score: 0.5
        })) || [];

        return new Response(
          JSON.stringify({
            results: books,
            total: books.length,
            query,
            fallback: true,
            message: "Showing popular books - search temporarily unavailable"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const books = data?.map((book: any) => ({
        ...book,
        similarity_score: 0.5 // Placeholder score
      })) || [];

      console.log(`Returning ${books.length} results from text search (embedding error fallback)`);

      return new Response(
        JSON.stringify({
          results: books,
          total: books.length,
          query,
          fallback: true,
          message: "Using text search - embedding service temporarily unavailable"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert embedding to pgvector format
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Build the query with filters
    let sqlQuery = `
      SELECT 
        id,
        title,
        description,
        authors,
        categories,
        image_url,
        preview_link,
        publisher,
        published_date,
        ratings_count,
        avg_rating,
        faiss_index,
        1 - (embedding <=> $1::vector) as similarity_score
      FROM books
      WHERE embedding IS NOT NULL
    `;

    // Add category filter if provided
    if (category_filter) {
      sqlQuery += ` AND categories::text ILIKE '%${category_filter}%'`;
    }

    // Add rating filter if provided
    if (min_rating && min_rating > 0) {
      sqlQuery += ` AND avg_rating >= ${min_rating}`;
    }

    sqlQuery += `
      ORDER BY embedding <=> $1::vector
      LIMIT ${limit}
    `;

    console.log("Executing pgvector similarity search...");

    // Execute the query using RPC (to pass vector parameter)
    const { data: books, error: dbError } = await supabase.rpc(
      'search_books_by_embedding',
      {
        query_embedding: embeddingStr,
        match_limit: limit,
        category_filter: category_filter || null,
        min_rating: min_rating || 0
      }
    );

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`Returning ${books?.length || 0} results`);

    return new Response(
      JSON.stringify({
        results: books || [],
        total: books?.length || 0,
        query,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in semantic-search:", error);

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
