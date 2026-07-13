import type { KworkProject, KworkProjectDisplay, KworkData, KworkCategoryStat } from "@/types/kwork";
import rawData from "@/data/kwork-services.json";

const data = rawData as KworkData;
const projects = data.projects;

/** 格式化价格（卢布 → 带单位的字符串） */
function formatPrice(price: number | null): string {
  if (price == null) return "-";
  if (price >= 1000) return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K ₽`;
  return `${price} ₽`;
}

/** 展开为 UI 展示格式 */
function toDisplay(p: KworkProject, rank: number): KworkProjectDisplay {
  return {
    rank,
    id: p.id,
    title: p.title || "Untitled",
    url: p.url || `https://kwork.ru/project/${p.id}`,
    price: p.price,
    category: p.categoryName || "Uncategorized",
    sellerUsername: p.worker?.username || "unknown",
    sellerFullname: p.worker?.fullname || null,
    sellerRating: p.worker?.rating ?? null,
    sellerReviewsCount: p.worker?.reviewsCount ?? null,
    favoritesCount: p.favoritesCount ?? null,
    ordersInQueue: p.ordersInQueue ?? null,
    isBest: p.isBest ?? null,
  };
}

/** 获取排序得分（用于排名）— 按评论数排序 */
function getScore(p: KworkProject): number {
  return p.worker?.reviewsCount ?? 0;
}

/** 获取 Top N 服务（按订单数降序） */
export function getTopProjects(n: number = 100): KworkProjectDisplay[] {
  const sorted = [...projects].sort((a, b) => getScore(b) - getScore(a));
  return sorted.slice(0, n).map((p, i) => toDisplay(p, i + 1));
}

/** 获取分页服务列表 */
export function getProjectsPage(
  page: number,
  pageSize: number = 50
): {
  projects: KworkProjectDisplay[];
  total: number;
  totalPages: number;
} {
  const sorted = [...projects].sort((a, b) => getScore(b) - getScore(a));
  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);
  return {
    projects: items.map((p, i) => toDisplay(p, start + i + 1)),
    total,
    totalPages,
  };
}

/** 获取总览统计 */
export function getOverviewStats() {
  const totalProjects = projects.length;
  const totalReviews = projects.reduce((sum, p) => sum + (p.worker?.reviewsCount ?? 0), 0);
  const projectsWithPrice = projects.filter((p) => p.price != null);
  const avgPrice =
    projectsWithPrice.length > 0
      ? projectsWithPrice.reduce((sum, p) => sum + (p.price ?? 0), 0) / projectsWithPrice.length
      : 0;

  const ratedProjects = projects.filter((p) => p.worker?.rating != null && p.worker.rating > 0);
  const avgRating =
    ratedProjects.length > 0
      ? ratedProjects.reduce((sum, p) => sum + (p.worker?.rating ?? 0), 0) / ratedProjects.length
      : 0;

  return {
    totalProjects,
    totalReviews,
    avgPrice: Math.round(avgPrice),
    avgRating: Math.round(avgRating * 100) / 100,
    projectsWithReviews: projects.filter((p) => (p.worker?.reviewsCount ?? 0) > 0).length,
  };
}

/** 搜索服务 */
export function searchProjects(query: string): KworkProjectDisplay[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const matched = projects.filter(
    (p) =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.worker?.username && p.worker.username.toLowerCase().includes(q)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
      (p.worker?.fullname && p.worker.fullname.toLowerCase().includes(q))
  );

  return matched
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 50)
    .map((p, i) => toDisplay(p, i + 1));
}

/** 获取分类统计 */
export function getCategoryStats(): KworkCategoryStat[] {
  const map = new Map<string, { count: number; totalPrice: number; totalReviews: number }>();

  for (const p of projects) {
    const cat = p.categoryName || "Uncategorized";
    const prev = map.get(cat) ?? { count: 0, totalPrice: 0, totalReviews: 0 };
    prev.count++;
    prev.totalPrice += p.price ?? 0;
    prev.totalReviews += p.worker?.reviewsCount ?? 0;
    map.set(cat, prev);
  }

  return Array.from(map.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      avgPrice: Math.round(stats.totalPrice / stats.count),
      totalReviews: stats.totalReviews,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 获取所有原始数据（用于客户端搜索） */
export function getAllProjects(): KworkProject[] {
  return projects;
}

/** 获取总数 */
export function getTotalCount(): number {
  return projects.length;
}

export { formatPrice };
