import { getTopProjects, getOverviewStats, getCategoryStats } from "@/lib/kwork/data";
import KworkTop100 from "@/components/KworkTop100";
import KworkServiceList from "@/components/KworkServiceList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kwork Projects - Top 100 Rankings",
  description: "Top ranked projects on Kwork.ru by review count, rating, and pricing",
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function CategoryBar({
  name,
  count,
  total,
}: {
  name: string;
  count: number;
  total: number;
}) {
  const pct = (count / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-44 truncate" title={name}>
        {name}
      </span>
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

export default function KworkPage() {
  const top100 = getTopProjects(100);
  const stats = getOverviewStats();
  const categories = getCategoryStats();
  const totalProjects = stats.totalProjects;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kwork Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          Data sourced from Kwork.ru — sorted by total reviews
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects.toLocaleString()}
          sub={
            stats.projectsWithReviews > 0
              ? `${stats.projectsWithReviews} with reviews`
              : undefined
          }
        />
        <StatCard
          label="Total Reviews"
          value={stats.totalReviews.toLocaleString()}
        />
        <StatCard
          label="Avg. Rating"
          value={
            stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "-"
          }
          sub={
            stats.avgRating > 0 ? "★ across all sellers" : undefined
          }
        />
        <StatCard
          label="Avg. Price"
          value={stats.avgPrice > 0 ? `${stats.avgPrice.toLocaleString()} ₽` : "-"}
        />
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Categories
        </h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <CategoryBar
              key={cat.name}
              name={cat.name}
              count={cat.count}
              total={totalProjects}
            />
          ))}
        </div>
      </div>

      {/* Top 100 Ranking */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Top 100 — Most Reviewed Projects
        </h2>
        <KworkTop100 projects={top100} />
      </div>

      {/* All Projects */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📋 All Projects
        </h2>
        <KworkServiceList />
      </div>
    </div>
  );
}
