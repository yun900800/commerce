/** 单个服务的数据结构 */
export interface LegiitService {
  /** 唯一标识 (从 URL 生成) */
  id: string;
  /** 服务标题 */
  title: string;
  /** 卖家用户名 */
  seller: string;
  /** 服务分类 */
  category: string;
  /** 完整 URL */
  url: string;
  /** 起步价 (美元) */
  price: number | null;
  /** 评论数 */
  reviews: number;
  /** 评分 (1-5) */
  rating: number;
  /** 卖家等级 */
  sellerLevel: string;
  /** 最后修改日期 (来自 sitemap) */
  lastmod: string;
  /** 抓取时间 */
  scrapedAt: string;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** API 分页响应 */
export interface PaginatedResponse<T> {
  services: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  categories: string[];
}

/** 排序选项 */
export type SortField = 'reviews' | 'price' | 'rating' | 'title' | 'lastmod';
export type SortOrder = 'asc' | 'desc';

/** 抓取请求参数 */
export interface ScrapeParams {
  maxPages?: number;       // 最多抓取页数（测试用）
  concurrency?: number;    // 并发数
}

/** 抓取状态 */
export interface ScrapeStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  totalUrls: number;
  scrapedCount: number;
  progressPercent: number;
  startedAt: string | null;
  error?: string;
}

/** 排名统计 */
export interface Top100Stats {
  totalServices: number;
  topReviewCount: number;
  avgRating: number;
  categoryDistribution: Record<string, number>;
}

/** 排名服务项（带排名） */
export interface RankedService extends LegiitService {
  rank: number;
}

/** Top 100 API 响应 */
export interface Top100Response {
  ranking: RankedService[];
  stats: Top100Stats;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/** API 错误响应 */
export interface ApiError {
  error: string;
  message: string;
}
