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

    // Construct query for price search - request JSON format in prompt
    const query = isbn 
      ? `Find where to buy the book "${title}" by ${author} (ISBN: ${isbn}) from online retailers.

Return ONLY a valid JSON object in this EXACT format (do not add any other text):

{
  "retailers": [
    {"retailer": "Amazon", "url": "https://www.amazon.com/dp/...", "price": 24.99, "type": "new"},
    {"retailer": "Barnes & Noble", "url": "https://www.barnesandnoble.com/w/...", "price": 19.99, "type": "used"}
  ]
}

Requirements:
- retailer: Full name of the retailer
- url: Direct link to THIS SPECIFIC BOOK on the retailer's website
- price: Current price as a number
- type: Must be "new", "used", or "ebook"

Return only the JSON, nothing else.`
      : `Find where to buy the book "${title}" by ${author} from online retailers.

Return ONLY a valid JSON object in this EXACT format (do not add any other text):

{
  "retailers": [
    {"retailer": "Amazon", "url": "https://www.amazon.com/dp/...", "price": 24.99, "type": "new"},
    {"retailer": "Barnes & Noble", "url": "https://www.barnesandnoble.com/w/...", "price": 19.99, "type": "used"}
  ]
}

Requirements:
- retailer: Full name of the retailer
- url: Direct link to THIS SPECIFIC BOOK on the retailer's website
- price: Current price as a number
- type: Must be "new", "used", or "ebook"

Return only the JSON, nothing else.`;

    // Call Gemini API with Google Search grounding
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: query 
            }] 
          }],
          tools: [{ googleSearch: {} }]
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorBody}`);
      throw new Error(`Gemini API error: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    
    // Check if Gemini returned a valid response
    if (!data.candidates || data.candidates.length === 0) {
      console.error("No candidates in Gemini response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No response from Gemini API - possibly rate limited or content filtered");
    }
    
    let text = "";
    let parsedData = null;
    
    try {
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = responseText;
      
      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        console.error("Empty response from Gemini API");
        throw new Error("Empty response from Gemini");
      }
      
      // Try to extract JSON from the response
      // Look for JSON in code blocks first
      const jsonBlockMatch = responseText.match(/```json\s*\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1].trim()) {
        parsedData = JSON.parse(jsonBlockMatch[1]);
      } else {
        // Try to find JSON object in the text
        const jsonMatch = responseText.match(/\{[\s\S]*"retailers"[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0].trim()) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else if (responseText.trim().startsWith('{')) {
          // Try parsing the whole response as JSON only if it starts with {
          parsedData = JSON.parse(responseText);
        }
      }
      
      console.log("Successfully parsed JSON response");
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      console.log("Response text (first 500 chars):", text.substring(0, 500));
      console.log("Full data structure:", JSON.stringify(data, null, 2).substring(0, 1000));
    }
    
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;

    // Extract prices from structured JSON response
    let prices = [];
    if (parsedData?.retailers && Array.isArray(parsedData.retailers)) {
      prices = parsedData.retailers
        .filter((r: any) => r.price != null && r.price > 0 && r.price < 1000) // Filter out null and invalid prices
        .map((r: any) => ({
          retailer: r.retailer,
          price: r.price,
          type: r.type,
          url: r.url,
          text: `${r.retailer}: $${r.price} - ${r.type}`
        }));
      
      console.log(`Extracted ${prices.length} prices from JSON`);
    } else {
      // Fallback to text parsing if JSON structure is unexpected
      console.log("JSON structure unexpected, using text parsing fallback");
      prices = extractPricesFromText(text, groundingMetadata);
    }

    return new Response(
      JSON.stringify({
        summary: text,
        prices,
        sources: groundingMetadata?.groundingChunks || [],
        searchQueries: groundingMetadata?.webSearchQueries || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching prices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function extractPricesFromText(text: string, metadata: any) {
  const prices = [];
  
  // Try to extract JSON objects from the text
  // Look for lines that start with { and end with }
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
      try {
        const priceObj = JSON.parse(trimmedLine);
        
        // Validate the parsed object has required fields
        if (priceObj.retailer && priceObj.price && priceObj.url) {
          const price = parseFloat(priceObj.price);
          
          // Skip if price seems invalid
          if (price > 0 && price < 1000) {
            prices.push({
              retailer: priceObj.retailer,
              price: price,
              type: priceObj.type || 'new',
              url: priceObj.url,
              text: trimmedLine
            });
          }
        }
      } catch (e) {
        // If JSON parsing fails, skip this line
        console.log('Failed to parse JSON line:', trimmedLine);
      }
    }
  }
  
  // If no JSON found, try the old text parsing as fallback
  if (prices.length === 0) {
    console.log('No JSON found, falling back to text parsing');
    
    // Extract source URLs from grounding metadata
    const sources = metadata?.groundingChunks || [];
    const sourceUrls = sources.map((chunk: any) => ({
      url: chunk.web?.uri || '',
      title: chunk.web?.title || ''
    })).filter((s: any) => s.url);
    
    for (const line of lines) {
      // Match pattern: "Retailer: $price - type"
      const priceMatch = line.match(/([A-Za-z\s&.'\-]+?):\s*\$?(\d+\.?\d*)\s*-?\s*(new|used|ebook|kindle)?/i);
      
      if (priceMatch && priceMatch[2]) {
        const retailer = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        const type = priceMatch[3] ? priceMatch[3].toLowerCase() : 'new';
        
        // Skip if price seems invalid
        if (price > 0 && price < 1000) {
          // Try to find a matching URL from sources
          let url = null;
          const retailerLower = retailer.toLowerCase();
          for (const source of sourceUrls) {
            const urlLower = source.url.toLowerCase();
            const titleLower = source.title.toLowerCase();
            
            if (urlLower.includes(retailerLower) || titleLower.includes(retailerLower) ||
                (retailerLower.includes('amazon') && urlLower.includes('amazon')) ||
                (retailerLower.includes('barnes') && urlLower.includes('barnesandnoble')) ||
                (retailerLower.includes('abebooks') && urlLower.includes('abebooks'))) {
              url = source.url;
              break;
            }
          }
          
          prices.push({
            retailer: retailer,
            price: price,
            type: type === 'kindle' ? 'ebook' : type,
            text: line.trim(),
            url: url || (sourceUrls[0]?.url || undefined)
          });
        }
      }
    }
  }
  
  return prices;
}

