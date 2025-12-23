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
  url?: string;
  text?: string;
}

// FIX 4: Updated list of known retailers (added missing ones)
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

// FIX 1: Stronger prompt with more aggressive JSON-only instruction
function buildStrongerPrompt(title: string, author: string, isbn?: string): string {
  const isbnPart = isbn ? ` (ISBN: ${isbn})` : '';
  
  return `CRITICAL: You MUST respond with ONLY valid JSON. Do NOT include any explanatory text, reasoning, markdown formatting, or code blocks.

Your response must START with { and END with }. Nothing before { and nothing after }.

Task: Find where to buy the book "${title}" by ${author}${isbnPart} from online retailers.

Response format (ONLY this JSON, no other text):
{
  "retailers": [
    {"retailer": "Amazon", "url": "https://www.amazon.com/dp/XXXXX", "price": 24.99, "type": "new"},
    {"retailer": "Barnes & Noble", "url": "https://www.barnesandnoble.com/w/XXXXX", "price": 19.99, "type": "used"}
  ]
}

Rules:
- retailer: Full retailer name (Amazon, Barnes & Noble, ThriftBooks, etc.)
- url: Direct link to THIS SPECIFIC BOOK on the retailer's website (not homepage)
- price: Current price as a number (e.g., 24.99)
- type: Must be "new", "used", or "ebook"

RESPOND WITH ONLY THE JSON OBJECT. Start with { and end with }.`;
}

// FIX 3: Enhanced fallback parsing for bullet-point format
function parseBulletPointFormat(text: string): RetailerPrice[] {
  const prices: RetailerPrice[] = [];
  const lines = text.split('\n');
  
  console.log('Attempting bullet-point parsing...');
  
  for (const line of lines) {
    // Match patterns like: *   **Amazon (Kindle)**: $2.99 - URL: `https://...`
    const bulletMatch = line.match(/\*+\s*\*?\*?([^:*]+)\*?\*?:\s*\$?(\d+\.?\d*)\s*(?:-\s*URL:\s*`?([^`\s]+)`?)?/i);
    
    if (bulletMatch) {
      const retailer = bulletMatch[1].trim();
      const price = parseFloat(bulletMatch[2]);
      let url = bulletMatch[3]?.trim();
      
      // Extract type from retailer name
      let type = 'new';
      const retailerLower = retailer.toLowerCase();
      if (retailerLower.includes('kindle') || retailerLower.includes('ebook') || 
          retailerLower.includes('nook') || retailerLower.includes('kobo')) {
        type = 'ebook';
      } else if (retailerLower.includes('used') || retailerLower.includes('thrift')) {
        type = 'used';
      }
      
      // Clean up retailer name
      let cleanRetailer = retailer.replace(/\(.*?\)/g, '').trim();
      
      if (price > 0 && price < 1000) {
        prices.push({
          retailer: cleanRetailer,
          price,
          type,
          url,
          text: line.trim()
        });
      }
    }
  }
  
  console.log(`Bullet-point parsing found ${prices.length} prices`);
  return prices;
}

// Enhanced JSON extraction with multiple strategies
function extractJSON(text: string): any {
  // Strategy 1: JSON code block
  let match = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.log('Code block JSON parse failed');
    }
  }
  
  // Strategy 2: Look for retailers array pattern
  match = text.match(/\{[\s\S]*?"retailers"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      console.log('Regex match JSON parse failed');
    }
  }
  
  // Strategy 3: Direct parse if starts and ends with braces
  if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.log('Direct JSON parse failed');
    }
  }
  
  // Strategy 4: Find first { and last } and try to parse that
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch (e) {
      console.log('Brace extraction JSON parse failed');
    }
  }
  
  return null;
}

// FIX 2: Retry logic with exponential backoff
async function fetchPricesWithRetry(
  title: string, 
  author: string, 
  isbn: string | undefined,
  geminiApiKey: string,
  retryCount: number = 0
): Promise<any> {
  const maxRetries = 2;
  const query = buildStrongerPrompt(title, author, isbn);
  
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": geminiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
          tools: [{ googleSearch: {} }]
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
      
      throw new Error(`Gemini API error: ${response.statusText}`);
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
    
    // Try to extract JSON using enhanced strategies
    let parsedData = extractJSON(responseText);
    
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    let prices: RetailerPrice[] = [];
    
    if (parsedData?.retailers && Array.isArray(parsedData.retailers)) {
      // Success! Got structured JSON
      prices = parsedData.retailers
        .filter((r: any) => r.price != null && r.price > 0 && r.price < 1000 && r.retailer && r.url)
        .map((r: any) => ({
          retailer: r.retailer,
          price: r.price,
          type: r.type || 'new',
          url: r.url,
          text: `${r.retailer}: $${r.price} - ${r.type}`
        }));
      
      console.log(`✅ Extracted ${prices.length} prices from JSON`);
    } else {
      // FIX 3: Try bullet-point format parsing
      console.log('⚠️ No valid JSON found, trying bullet-point parsing');
      prices = parseBulletPointFormat(responseText);
      
      // If bullet-point parsing also failed, try old text parsing
      if (prices.length === 0) {
        console.log('⚠️ Bullet-point parsing failed, trying line-by-line text parsing');
        prices = extractPricesFromText(responseText, groundingMetadata);
      }
    }

    // Filter out retailers not in known list (optional quality check)
    const validPrices = prices.filter(p => {
      const retailerLower = p.retailer.toLowerCase();
      const isKnown = KNOWN_RETAILERS.some(kr => retailerLower.includes(kr) || kr.includes(retailerLower));
      if (!isKnown) {
        console.log(`⚠️  Unknown retailer: ${p.retailer}`);
      }
      return true; // Still include unknown retailers, just log them
    });

    return new Response(
      JSON.stringify({
        summary: responseText,
        prices: validPrices,
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

// Legacy text parsing function (kept as final fallback)
function extractPricesFromText(text: string, metadata: any): RetailerPrice[] {
  const prices: RetailerPrice[] = [];
  const lines = text.split('\n');
  
  // Extract source URLs
  const sources = metadata?.groundingChunks || [];
  const sourceUrls = sources.map((chunk: any) => ({
    url: chunk.web?.uri || '',
    title: chunk.web?.title || ''
  })).filter((s: any) => s.url);
  
  for (const line of lines) {
    // Try JSON line parsing first
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      try {
        const priceObj = JSON.parse(trimmedLine);
        if (priceObj.retailer && priceObj.price && priceObj.url) {
          const price = parseFloat(priceObj.price);
          if (price > 0 && price < 1000) {
            prices.push({
              retailer: priceObj.retailer,
              price,
              type: priceObj.type || 'new',
              url: priceObj.url,
              text: trimmedLine
            });
            continue;
          }
        }
      } catch (e) {
        // Continue to regex matching
      }
    }
    
    // Regex pattern matching
    const priceMatch = line.match(/([A-Za-z\s&.'\-]+?):\s*\$?(\d+\.?\d*)\s*-?\s*(new|used|ebook|kindle|hardcover|paperback|audiobook)?/i);
    
    if (priceMatch && priceMatch[2]) {
      const retailer = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);
      const type = priceMatch[3] ? priceMatch[3].toLowerCase() : 'new';
      
      if (price > 0 && price < 1000) {
        // Try to find matching URL
        let url = undefined;
        const retailerLower = retailer.toLowerCase();
        for (const source of sourceUrls) {
          const urlLower = source.url.toLowerCase();
          if (urlLower.includes(retailerLower) ||
              (retailerLower.includes('amazon') && urlLower.includes('amazon')) ||
              (retailerLower.includes('barnes') && urlLower.includes('barnesandnoble'))) {
            url = source.url;
            break;
          }
        }
        
        prices.push({
          retailer,
          price,
          type: type === 'kindle' ? 'ebook' : type,
          url: url || sourceUrls[0]?.url,
          text: line.trim()
        });
      }
    }
  }
  
  console.log(`Text parsing found ${prices.length} prices`);
  return prices;
}
