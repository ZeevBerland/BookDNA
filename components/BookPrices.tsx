'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ExternalLink, RefreshCw } from 'lucide-react';

interface Price {
  retailer: string;
  price: number;
  type: 'new' | 'used' | 'ebook';
  text: string;
  url?: string;
}

interface BookPricesProps {
  bookId: number;
  title: string;
  author: string;
  isbn?: string;
}

export default function BookPrices({ bookId, title, author, isbn }: BookPricesProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrices();
  }, [bookId]);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        bookId: bookId.toString(),
        title,
        author,
        ...(isbn && { isbn })
      });
      
      const response = await fetch(`/api/book-prices?${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch prices');
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-gradient-to-br from-copper/5 to-brown-medium/5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <DollarSign className="w-6 h-6 text-copper animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <DollarSign className="w-6 h-6 text-copper opacity-20" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-brown-dark">Fetching Latest Prices</h3>
            <p className="text-sm text-brown-medium">Searching across multiple retailers...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-white/50 rounded animate-pulse">
              <div className="h-4 bg-brown-medium/20 rounded w-32"></div>
              <div className="h-5 bg-copper/20 rounded w-16"></div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-brown-medium/60">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>This may take a few moments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <p className="text-red-700 text-sm">Failed to load prices: {error}</p>
        <button
          onClick={fetchPrices}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data || !data.prices || data.prices.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm text-center">
        <p className="text-brown-medium text-sm">No prices found for this book at the moment.</p>
        <button
          onClick={fetchPrices}
          className="mt-3 text-sm text-copper hover:text-brown-dark underline"
        >
          Try fetching again
        </button>
      </div>
    );
  }

  // Filter out any invalid prices (missing retailer name or url)
  const validPrices = data.prices.filter((p: Price) => 
    p.retailer && 
    p.retailer !== 'Price' && 
    p.price > 0 && 
    p.url
  );

  const groupedPrices = {
    new: validPrices.filter((p: Price) => p.type === 'new'),
    used: validPrices.filter((p: Price) => p.type === 'used'),
    ebook: validPrices.filter((p: Price) => p.type === 'ebook')
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-brown-dark flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-copper" />
          Price Comparison
        </h3>
        {data.cached && (
          <button
            onClick={fetchPrices}
            className="text-xs text-brown-medium hover:text-copper flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>

      <div className="space-y-4">
        {['new', 'used', 'ebook'].map(type => {
          const prices = groupedPrices[type as keyof typeof groupedPrices];
          if (!prices || prices.length === 0) return null;
          
          return (
            <div key={type}>
              <h4 className="text-sm font-semibold text-brown-medium mb-2 capitalize">
                {type === 'ebook' ? 'eBook' : type}
              </h4>
              <div className="space-y-2">
                {prices.map((price: Price, idx: number) => {
                  // Extra safety check
                  if (!price.retailer || price.retailer === 'Price' || !price.url) {
                    return null;
                  }
                  
                  return (
                    <div
                      key={`${type}-${price.retailer}-${idx}`}
                      className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                    >
                      <a
                        href={price.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brown-dark hover:text-copper flex items-center gap-1 transition-colors"
                      >
                        {price.retailer}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-lg font-bold text-copper">
                        ${price.price.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-brown-medium/60">
        {data.cached ? (
          <>Last updated: {new Date(data.lastFetched).toLocaleDateString()}</>
        ) : (
          <>Just fetched</>
        )}
      </div>
    </div>
  );
}

