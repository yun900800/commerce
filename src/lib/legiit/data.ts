import type { LegiitService, LegiitServiceDisplay, LegiitData, CategoryStat } from "@/types/legiit";
import rawData from "@/data/legiit-services.json";

const data = rawData as LegiitData;
const services = data.services;

/** 生成 Legiit 完整 URL */
function makeUrl(username: string, seoUrl: string): string {
  return `https://legiit.com/${encodeURIComponent(username)}/${encodeURIComponent(seoUrl)}`;
}

/** 展開為 UI 展示格式 */
function toDisplay(svc: LegiitService, rank: number): LegiitServiceDisplay {
  return {
    rank,
    username: svc.u,
    seoUrl: svc.s,
    title: svc.t,
    rating: svc.r,
    reviewCount: svc.rc,
    basicPrice: svc.bp,
    standardPrice: svc.sp,
    premiumPrice: svc.pp,
    sellerLevel: svc.l,
    category: svc.cat,
    subcategory: svc.sub,
    sellerTotalReviews: svc.sr,
    createdAt: svc.cr,
    url: makeUrl(svc.u, svc.s),
  };
}

/** 獲取 Top N 服務（按評論數降序） */
export function getTopServices(n: number = 100): LegiitServiceDisplay[] {
  const sorted = [...services].sort((a, b) => (b.rc ?? 0) - (a.rc ?? 0));
  return sorted.slice(0, n).map((svc, i) => toDisplay(svc, i + 1));
}

/** 獲取分頁服務列表 */
export function getServicesPage(page: number, pageSize: number = 50): {
  services: LegiitServiceDisplay[];
  total: number;
  totalPages: number;
} {
  const sorted = [...services].sort((a, b) => (b.rc ?? 0) - (a.rc ?? 0));
  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);
  return {
    services: items.map((svc, i) => toDisplay(svc, start + i + 1)),
    total,
    totalPages,
  };
}

/** 獲取服務總覽統計 */
export function getOverviewStats() {
  const totalServices = services.length;
  const totalReviews = services.reduce((sum, s) => sum + (s.rc ?? 0), 0);
  const servicesWithPrice = services.filter(s => s.bp != null);
  const avgBasicPrice = servicesWithPrice.length > 0
    ? servicesWithPrice.reduce((sum, s) => sum + (s.bp ?? 0), 0) / servicesWithPrice.length
    : 0;
  const ratedServices = services.filter(s => s.r != null && s.r > 0);
  const avgRating = ratedServices.length > 0
    ? ratedServices.reduce((sum, s) => sum + (s.r ?? 0), 0) / ratedServices.length
    : 0;

  return {
    totalServices,
    totalReviews,
    avgBasicPrice: Math.round(avgBasicPrice * 100) / 100,
    avgRating: Math.round(avgRating * 100) / 100,
    servicesWithReviews: services.filter(s => (s.rc ?? 0) > 0).length,
  };
}

/** 搜索服務 */
export function searchServices(query: string): LegiitServiceDisplay[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const matched = services.filter(s =>
    s.t.toLowerCase().includes(q) ||
    s.u.toLowerCase().includes(q) ||
    s.cat.toLowerCase().includes(q) ||
    s.sub.toLowerCase().includes(q)
  );

  return matched
    .sort((a, b) => (b.rc ?? 0) - (a.rc ?? 0))
    .slice(0, 50)
    .map((svc, i) => toDisplay(svc, i + 1));
}

/** 獲取分類統計 */
export function getCategoryStats(): CategoryStat[] {
  const map = new Map<string, { count: number; totalPrice: number; totalReviews: number }>();

  for (const s of services) {
    const cat = s.cat || "Uncategorized";
    const prev = map.get(cat) ?? { count: 0, totalPrice: 0, totalReviews: 0 };
    prev.count++;
    prev.totalPrice += s.bp ?? 0;
    prev.totalReviews += s.rc ?? 0;
    map.set(cat, prev);
  }

  return Array.from(map.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      avgPrice: Math.round((stats.totalPrice / stats.count) * 100) / 100,
      totalReviews: stats.totalReviews,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 獲取所有服務（用於客戶端搜索） */
export function getAllServices(): LegiitService[] {
  return services;
}

/** 獲取總數 */
export function getTotalCount(): number {
  return services.length;
}
