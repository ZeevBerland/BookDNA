import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceRequest {
  title: string;
  author: string;
  isbn?: string;
}

interface RetailerPrice {
  retailer: string;
  price: number;
  type: string;
  url: string;
}

// Response Schema for Gemini - enforces structured JSON output
const PRICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    retailers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          retailer: {
            type: "STRING",
            description: "Name of the store (e.g. Amazon, Barnes & Noble, ThriftBooks)"
          },
          price: {
            type: "NUMBER",
            description: "Price in USD"
          },
          type: {
            type: "STRING",
            enum: ["new", "used", "ebook"],
            description: "Condition or format of the book"
          },
          url: {
            type: "STRING",
            description: "Direct link to the product page on the retailer's website"
          }
        },
        required: ["retailer", "price", "type", "url"]
      }
    },
    summary: {
      type: "STRING",
      description: "A brief summary of availability (e.g. 'Available new from $15.99')"
    }
  },
  required: ["retailers"]
};

// Known retailers for validation
const KNOWN_RETAILERS = [
  'amazon', 'barnesandnoble', 'barnes & noble', 'bookshop', 'abebooks',
  'thriftbooks', 'betterworldbooks', 'target', 'walmart',
  'books-a-million', 'booksamillion', 'indiebound', 'play.google', 'apple',
  'kobo', 'audible', 'hpb', 'half price books', 'bookoutlet', 'alibris'
];

// Helper function to sleep for retry logic
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build a clean, focused prompt (schema handles JSON structure)
function buildPrompt(title: string, author: string, isbn?: string): string {
  const isbnPart = isbn ? ` (ISBN: ${isbn})` : '';
  
  return `Find current retail prices for purchasing this book:
Title: "${title}"
Author: ${author}${isbnPart}

Search major online retailers like Amazon, Barnes & Noble, AbeBooks, Books-A-Million, Bookshop.org, Half Price Books, ThriftBooks, and Alibris.

Requirements:
- Find actual current prices from real retailers
- Include direct product URLs (not search pages or homepage)
- Find prices for different conditions: new, used, and ebook formats
- Use the retailer's full name (e.g. "Barnes & Noble", not "B&N")`;
}

// Fetch prices with retry logic and exponential backoff
async function fetchPricesWithRetry(
  title: string, 
  author: string, 
  isbn: string | undefined,
  geminiApiKey: string,
  retryCount: number = 0
): Promise<any> {
  const maxRetries = 2;
  const query = buildPrompt(title, author, isbn);
  
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: PRICE_SCHEMA,
            temperature: 0.1,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorBody}`);
      
      // Retry on 429 (rate limit) or 503 (service unavailable)
      if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
        const waitTime = 2000 * Math.pow(2, retryCount); // Exponential backoff: 2s, 4s
        console.log(`Rate limited or service unavailable. Retrying in ${waitTime}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await sleep(waitTime);
        return fetchPricesWithRetry(title, author, isbn, geminiApiKey, retryCount + 1);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check for no candidates (rate limit or content filter)
    if (!data.candidates || data.candidates.length === 0) {
      console.error("No candidates in response");
      
      // Retry with backoff
      if (retryCount < maxRetries) {
        const waitTime = 2000 * Math.pow(2, retryCount);
        console.log(`No candidates returned. Retrying in ${waitTime}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await sleep(waitTime);
        return fetchPricesWithRetry(title, author, isbn, geminiApiKey, retryCount + 1);
      }
      
      // Return empty result after all retries
      return {
        summary: "No price information available at this time.",
        prices: [],
        sources: [],
        searchQueries: []
      };
    }
    
    return data;
    
  } catch (error) {
    // Retry on network errors
    if (retryCount < maxRetries && error.name !== 'SyntaxError') {
      const waitTime = 2000 * Math.pow(2, retryCount);
      console.log(`Network error. Retrying in ${waitTime}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await sleep(waitTime);
      return fetchPricesWithRetry(title, author, isbn, geminiApiKey, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, author, isbn }: PriceRequest = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    console.log(`Fetching prices for: "${title}" by ${author}`);

    // Use retry logic
    const data = await fetchPricesWithRetry(title, author, isbn, GEMINI_API_KEY);
    
    // If we got an empty result from retries, return it
    if (data.prices !== undefined) {
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    
    if (!responseText || responseText.trim().length === 0) {
      console.error("Empty response from Gemini");
      return new Response(
        JSON.stringify({
          summary: "No price information available.",
          prices: [],
          sources: [],
          searchQueries: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Response length: ${responseText.length} chars`);
    console.log(`Response preview: ${responseText.substring(0, 200)}...`);
    
    // With responseSchema, the response is guaranteed to be valid JSON
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response (should not happen with schema):", parseError);
      return new Response(
        JSON.stringify({
          summary: "Failed to parse price information.",
          prices: [],
          sources: groundingMetadata?.groundingChunks || [],
          searchQueries: groundingMetadata?.webSearchQueries || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate and filter prices
    const prices: RetailerPrice[] = (parsedData.retailers || [])
      .filter((r: any) => {
        // Basic validation
        if (!r.retailer || !r.price || !r.url || !r.type) {
          console.log(`⚠️  Filtered out invalid entry: ${JSON.stringify(r)}`);
          return false;
        }
        
        // Price validation
        if (r.price <= 0 || r.price >= 1000) {
          console.log(`⚠️  Filtered out price out of range: ${r.retailer} $${r.price}`);
          return false;
        }
        
        // URL validation
        if (!r.url.startsWith('http')) {
          console.log(`⚠️  Filtered out invalid URL: ${r.retailer} - ${r.url}`);
          return false;
        }
        
        // Check if retailer is known (log warning but don't filter)
        const retailerLower = r.retailer.toLowerCase();
        const isKnown = KNOWN_RETAILERS.some(kr => 
          retailerLower.includes(kr) || kr.includes(retailerLower)
        );
        if (!isKnown) {
          console.log(`⚠️  Unknown retailer (keeping anyway): ${r.retailer}`);
        }
        
        return true;
      })
      .map((r: any) => ({
        retailer: r.retailer,
        price: r.price,
        type: r.type,
        url: r.url
      }));

    console.log(`✅ Returning ${prices.length} valid prices`);
    console.log(`🔍 Grounding sources: ${groundingMetadata?.groundingChunks?.length || 0}`);

    return new Response(
      JSON.stringify({
        summary: parsedData.summary || `Found ${prices.length} prices from various retailers.`,
        prices: prices,
        sources: groundingMetadata?.groundingChunks || [],
        searchQueries: groundingMetadata?.webSearchQueries || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching prices:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        summary: "Failed to fetch prices",
        prices: [],
        sources: [],
        searchQueries: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
