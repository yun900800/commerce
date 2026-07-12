"use client";

import { useState, useMemo } from "react";
import type { LegiitService } from "@/types/legiit";
import { getAllServices } from "@/lib/legiit/data";

const PAGE_SIZE = 50;

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-400">-</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "");
  return (
    <span className="text-yellow-500 text-sm" title={rating.toFixed(2)}>
      {stars}
    </span>
  );
}

function LevelBadge({ level }: { level: string }) {
  if (!level || level === "Unranked") return null;
  const colors: Record<string, string> = {
    "Level 1": "bg-gray-100 text-gray-700",
    "Level 2": "bg-blue-100 text-blue-700",
    "Level 3": "bg-green-100 text-green-700",
    "Level 4": "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[level] || "bg-gray-100 text-gray-600"}`}>
      {level}
    </span>
  );
}

export default function LegiitServiceList() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"reviews" | "price" | "rating">("reviews");

  const allServices = useMemo(() => getAllServices(), []);

  const filtered = useMemo(() => {
    let items = allServices;

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter(s =>
        s.t.toLowerCase().includes(q) ||
        s.u.toLowerCase().includes(q) ||
        s.cat.toLowerCase().includes(q) ||
        s.sub.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      if (sortBy === "reviews") return (b.rc ?? 0) - (a.rc ?? 0);
      if (sortBy === "price") return (a.bp ?? 0) - (b.bp ?? 0);
      if (sortBy === "rating") return (b.r ?? 0) - (a.r ?? 0);
      return 0;
    });

    return sorted;
  }, [allServices, query, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when search changes
  function handleSearch(v: string) {
    setQuery(v);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Controls: Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by title, seller, category..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="reviews">Sort by Reviews ↓</option>
          <option value="price">Sort by Price ↑</option>
          <option value="rating">Sort by Rating ↓</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} services
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reviews</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((svc) => (
                <tr key={`${svc.u}-${svc.s}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`https://legiit.com/${encodeURIComponent(svc.u)}/${encodeURIComponent(svc.s)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block max-w-xs"
                      title={svc.t}
                    >
                      {svc.t}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-700">{svc.u}</span>
                      <LevelBadge level={svc.l} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {svc.bp != null ? `$${svc.bp}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StarRating rating={svc.r} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {svc.rc?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{svc.cat}</span>
                      {svc.sub && <span className="text-xs text-gray-400">{svc.sub}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    pageNum === page
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
