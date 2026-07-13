"use client";

import { useState, useMemo } from "react";
import type { KworkProject } from "@/types/kwork";
import { getAllProjects } from "@/lib/kwork/data";

const PAGE_SIZE = 50;

function formatPrice(price: number | null): string {
  if (price == null) return "-";
  if (price >= 1000) {
    return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(price);
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-400">-</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "");
  return (
    <span className="text-yellow-500 text-sm" title={rating?.toFixed(2)}>
      {stars}
    </span>
  );
}

function getScore(p: KworkProject): number {
  return p.worker?.reviewsCount ?? 0;
}

export default function KworkServiceList() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"orders" | "price" | "rating">("orders");

  const allProjects = useMemo(() => getAllProjects(), []);

  const filtered = useMemo(() => {
    let items = allProjects;

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      items = items.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.worker?.username && p.worker.username.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
          (p.worker?.fullname && p.worker.fullname.toLowerCase().includes(q))
      );
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      if (sortBy === "orders") return getScore(b) - getScore(a);
      if (sortBy === "price") return (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === "rating") return (b.worker?.rating ?? 0) - (a.worker?.rating ?? 0);
      return 0;
    });

    return sorted;
  }, [allProjects, query, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="orders">Sort by Orders ↓</option>
          <option value="price">Sort by Price ↑</option>
          <option value="rating">Sort by Rating ↓</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} projects
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Seller
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Rating
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Reviews
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Favorites
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((p) => (
                <tr
                  key={p.id ?? `${p.worker?.username}-${p.title}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <a
                      href={p.url || `https://kwork.ru/project/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block max-w-xs"
                      title={p.title ?? ""}
                    >
                      {p.title}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-gray-700">
                        {p.worker?.username || "unknown"}
                      </span>
                      {p.worker?.fullname && (
                        <span className="text-xs text-gray-400">
                          {p.worker.fullname}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {p.price != null ? `${formatPrice(p.price)} ₽` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StarRating rating={p.worker?.rating ?? null} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {p.worker?.reviewsCount?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {p.favoritesCount?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {p.categoryName || "Uncategorized"}
                    </span>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
