"use client";

import { Filing } from "@/types/sec";

interface FilingListProps {
  filings: Filing[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  cik?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const formTypeColors: Record<string, string> = {
  "10-K": "bg-blue-100 text-blue-800",
  "10-K/A": "bg-blue-100 text-blue-800",
  "20-F": "bg-blue-100 text-blue-800",
  "10-Q": "bg-green-100 text-green-800",
  "10-Q/A": "bg-green-100 text-green-800",
  "8-K": "bg-orange-100 text-orange-800",
  "8-K/A": "bg-orange-100 text-orange-800",
  "4": "bg-purple-100 text-purple-800",
  "13G": "bg-pink-100 text-pink-800",
  "13G/A": "bg-pink-100 text-pink-800",
  "13D": "bg-pink-100 text-pink-800",
  "13D/A": "bg-pink-100 text-pink-800",
  "SD": "bg-yellow-100 text-yellow-800",
  "SD/A": "bg-yellow-100 text-yellow-800",
};

function getBadgeColor(formType: string): string {
  return formTypeColors[formType] ?? "bg-gray-100 text-gray-800";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function FilingList({
  filings,
  loading,
  error,
  onRetry,
  cik,
  hasMore,
  onLoadMore,
}: FilingListProps) {
  const handleDownload = (filing: Filing) => {
    if (!cik || !filing.documents?.[0]) return;
    const doc = filing.documents[0];
    window.open(
      `/api/sec/download?cik=${cik}&accession=${filing.accessionNumber}&doc=${doc.name}`,
      "_blank"
    );
  };

  const handleViewOnSec = (filing: Filing) => {
    if (!cik || !filing.documents?.[0]) return;
    const doc = filing.documents[0];
    // Use our view proxy (has proper User-Agent, SEC won't block)
    window.open(
      `/api/sec/view?cik=${cik}&accession=${filing.accessionNumber}&doc=${doc.name}`,
      "_blank"
    );
  };

  const handleViewTranslated = (filing: Filing) => {
    if (!cik || !filing.documents?.[0]) return;
    const doc = filing.documents[0];
    // Our view proxy with Google Translate widget injected
    window.open(
      `/api/sec/view?cik=${cik}&accession=${filing.accessionNumber}&doc=${doc.name}&translate=1`,
      "_blank"
    );
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-3">
        {/* Desktop skeleton table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提交日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="animate-pulse bg-gray-200 rounded h-5 w-16" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-48" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="animate-pulse bg-gray-200 rounded h-5 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile skeleton cards */}
        <div className="block sm:hidden space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div className="animate-pulse bg-gray-200 rounded h-5 w-20" />
              <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
              <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
              <div className="animate-pulse bg-gray-200 rounded h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-5 h-5 text-red-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700 truncate">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 text-sm font-medium text-red-700 hover:text-red-900 underline"
            >
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (!filings.length) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-500">暂无符合条件的 SEC 文件</p>
      </div>
    );
  }

  /* ── Data table / cards ── */
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                提交日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filings.map((filing) => (
              <tr
                key={filing.accessionNumber}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(filing.formType)}`}
                  >
                    {filing.formType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-700 max-w-xs truncate">
                    {filing.description}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {formatDate(filing.filingDate)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(filing)}
                      disabled={!cik || !filing.documents?.length}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-3.5 h-3.5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      下载
                    </button>
                    <button
                      onClick={() => handleViewOnSec(filing)}
                      disabled={!cik || !filing.documents?.length}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="内联查看 SEC 文件"
                    >
                      <svg
                        className="w-3.5 h-3.5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      查看
                    </button>
                    <button
                      onClick={() => handleViewTranslated(filing)}
                      disabled={!cik || !filing.documents?.length}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="内联查看并启用 Google 翻译为中文"
                    >
                      <svg
                        className="w-3.5 h-3.5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m0 4a4 4 0 00-4 4h8a4 4 0 00-4-4zm0 0V5m-6 8h12M5 19l14-4-4 8-10-4z"
                        />
                      </svg>
                      翻译
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {filings.map((filing) => (
          <div
            key={filing.accessionNumber}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(filing.formType)}`}
              >
                {filing.formType}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(filing.filingDate)}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {filing.description}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(filing)}
                disabled={!cik || !filing.documents?.length}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                下载
              </button>
              <button
                onClick={() => handleViewOnSec(filing)}
                disabled={!cik || !filing.documents?.length}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                查看
              </button>
              <button
                onClick={() => handleViewTranslated(filing)}
                disabled={!cik || !filing.documents?.length}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m0 4a4 4 0 00-4 4h8a4 4 0 00-4-4zm0 0V5m-6 8h12M5 19l14-4-4 8-10-4z"
                  />
                </svg>
                翻译
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="mt-4">
          <button
            onClick={onLoadMore}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

export default FilingList;
