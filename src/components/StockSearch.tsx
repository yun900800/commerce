"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Stock } from "@/types/sec";

interface StockSearchProps {
  onSelect: (stock: { ticker: string; name: string; cik: string }) => void;
  selectedStock?: { ticker: string; name: string; cik: string } | null;
}

export default function StockSearch({ onSelect, selectedStock }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<{ ticker: string; name: string; cik: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use prop as source of truth when provided, fall back to local state
  const displayStock = selectedStock !== undefined ? selectedStock : selected;

  // Close dropdown on click outside
  const handleMousedown = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);
    return () => document.removeEventListener("mousedown", handleMousedown);
  }, [handleMousedown]);

  // Debounced search with abort controller
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sec/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (Array.isArray(data)) {
          setResults(data as Stock[]);
        } else {
          setResults([]);
        }

        setIsOpen(true);
      } catch (err) {
        // Silently ignore aborted requests — the query changed before the response arrived
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Stock search error:", err);
        setError("搜索失败，请重试");
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Handle external clear: when parent sets selectedStock to null, reset the input
  useEffect(() => {
    if (selectedStock === null) {
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setSelected(null);
    }
  }, [selectedStock]);

  const handleSelect = (stock: Stock) => {
    const picked = { ticker: stock.ticker, name: stock.name, cik: stock.cik };
    setSelected(picked);
    onSelect(picked);
    setIsOpen(false);
    setResults([]);
    setQuery("");
  };

  const handleClear = () => {
    setQuery("");
    setSelected(null);
    setResults([]);
    setIsOpen(false);
    // Notify parent that selection was cleared
    onSelect({ ticker: "", name: "", cik: "" });
  };

  const showChip = displayStock !== null && displayStock.ticker !== "";

  return (
    <div ref={containerRef} className="relative">
      {showChip ? (
        /* ── Selected stock chip ── */
        <div className="w-full border border-gray-300 rounded-lg px-4 py-2.5 flex items-center">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
            <span>{displayStock!.ticker} - {displayStock!.name}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-0.5 text-blue-400 hover:text-blue-600 focus:outline-none transition-colors"
              aria-label="移除选中股票"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      ) : (
        /* ── Search input ── */
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              // Re-open dropdown if there are results from a previous search
              if (results.length > 0 || error || (query.trim() !== "" && !isLoading)) {
                setIsOpen(true);
              }
            }}
            placeholder="输入股票代码或公司名称..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* ── Dropdown ── */}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {isLoading && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  搜索中...
                </div>
              )}

              {!isLoading && error && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">{error}</div>
              )}

              {!isLoading && !error && results.length === 0 && query.trim() !== "" && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">未找到匹配的股票</div>
              )}

              {!isLoading && !error && results.map((stock) => (
                <div
                  key={stock.ticker}
                  onClick={() => handleSelect(stock)}
                  className="px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-gray-900">{stock.ticker}</span>
                  <span className="text-gray-500 truncate ml-4 text-right">{stock.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
