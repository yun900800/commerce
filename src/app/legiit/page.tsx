import { getTopServices, getOverviewStats, getCategoryStats } from "@/lib/legiit/data";
import LegiitTop100 from "@/components/LegiitTop100";
import LegiitServiceList from "@/components/LegiitServiceList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legiit Services - Top 100 Rankings",
  description: "Top ranked services on Legiit.com by review count, rating, and pricing",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function CategoryBar({ name, count, total }: { name: string; count: number; total: number }) {
  const pct = (count / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-44 truncate" title={name}>{name}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-16 text-right">{count}</span>
    </div>
  );
}

export default function LegiitPage() {
  const top100 = getTopServices(100);
  const stats = getOverviewStats();
  const categories = getCategoryStats();
  const totalServices = stats.totalServices;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Legiit Services</h1>
        <p className="text-sm text-gray-500 mt-1">
          Data sourced from Legiit.com — sorted by total review count
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Services"
          value={stats.totalServices.toLocaleString()}
          sub={stats.servicesWithReviews > 0 ? `${stats.servicesWithReviews} with reviews` : undefined}
        />
        <StatCard
          label="Total Reviews"
          value={stats.totalReviews.toLocaleString()}
        />
        <StatCard
          label="Avg. Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "-"}
          sub={stats.avgRating > 0 ? "★ across all services" : undefined}
        />
        <StatCard
          label="Avg. Starting Price"
          value={stats.avgBasicPrice > 0 ? `$${stats.avgBasicPrice.toFixed(2)}` : "-"}
        />
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <CategoryBar
              key={cat.name}
              name={cat.name}
              count={cat.count}
              total={totalServices}
            />
          ))}
        </div>
      </div>

      {/* Top 100 Ranking */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🏆 Top 100 — Most Reviewed Services
        </h2>
        <LegiitTop100 services={top100} />
      </div>

      {/* All Services */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📋 All Services
        </h2>
        <LegiitServiceList />
      </div>
    </div>
  );
}
