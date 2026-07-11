"use client";

import { useState, useEffect, useCallback } from "react";
import StockSearch from "@/components/StockSearch";
import DateRangePicker from "@/components/DateRangePicker";
import FilingTypeFilter from "@/components/FilingTypeFilter";
import FilingList from "@/components/FilingList";
import type { Filing } from "@/types/sec";

export default function FinancePage() {
  const [selectedStock, setSelectedStock] = useState<{
    ticker: string;
    name: string;
    cik: string;
  } | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
    () => {
      // Default: last year
      const to = new Date().toISOString().split("T")[0];
      const from = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0];
      return { from, to };
    }
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  const fetchFilings = useCallback(
    async (pageNum = 1) => {
      if (!selectedStock) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          cik: selectedStock.cik,
          from: dateRange.from,
          to: dateRange.to,
        });

        if (selectedTypes.length > 0) {
          params.set("types", selectedTypes.join(","));
        }

        const response = await fetch(`/api/sec/filings?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`请求失败 (${response.status})`);
        }

        const data: Filing[] = await response.json();
        setFilings((prev) =>
          pageNum > 1 ? [...prev, ...data] : data
        );
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "获取文件列表时发生错误";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [selectedStock, dateRange, selectedTypes]
  );

  // Auto-fetch when filters change
  useEffect(() => {
    if (selectedStock) {
      fetchFilings(1);
    }
  }, [selectedStock, dateRange, selectedTypes, fetchFilings]);

  return (
    <div className="space-y-6">
      {/* Stock Search Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择股票
        </label>
        <StockSearch
          onSelect={setSelectedStock}
          selectedStock={selectedStock}
        />
      </div>

      {/* Filter Section - only shown when stock selected */}
      {selectedStock ? (
        <>
          {/* Stock info bar */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-blue-900">
                {selectedStock.ticker}
              </span>
              <span className="text-blue-700 ml-2">{selectedStock.name}</span>
            </div>
            <span className="text-xs text-blue-500">
              CIK: {selectedStock.cik}
            </span>
          </div>

          {/* Date Range + Type Filter in a grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                时间范围
              </h3>
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={setDateRange}
              />
            </div>
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                文件类型
              </h3>
              <FilingTypeFilter
                selected={selectedTypes}
                onChange={setSelectedTypes}
              />
            </div>
          </div>

          {/* Filing Results */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">文件列表</h2>
            </div>
            <FilingList
              filings={filings}
              loading={loading}
              error={error}
              cik={selectedStock.cik}
              onRetry={() => fetchFilings(1)}
              hasMore={hasMore}
              onLoadMore={() => fetchFilings(page + 1)}
            />
          </div>
        </>
      ) : (
        /* Empty state when no stock selected */
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            选择股票开始查询
          </h3>
          <p className="text-sm text-gray-500">
            在上方搜索框中输入股票代码或公司名称
          </p>
        </div>
      )}
    </div>
  );
}
