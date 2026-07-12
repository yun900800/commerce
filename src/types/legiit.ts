/** Legiit 服務數據類型（對應 JSON 中的壓縮字段） */
export interface LegiitService {
  u: string;   // username
  s: string;   // seo_url
  t: string;   // title
  r: number | null;   // service_rating
  rc: number | null;  // total_review_count
  bp: number | null;  // basic_plan_price
  sp: number | null;  // standard_plan_price
  pp: number | null;  // premium_plan_price
  l: string;   // seller_level
  cat: string; // category_name
  sub: string; // subcategory_name
  sr: number | null;  // seller_total_review
  cr: string;  // created_at
}

export interface LegiitData {
  total: number;
  generated_at: string;
  services: LegiitService[];
}

/** UI 展示用的展開字段 */
export interface LegiitServiceDisplay {
  rank: number;
  username: string;
  seoUrl: string;
  title: string;
  rating: number | null;
  reviewCount: number | null;
  basicPrice: number | null;
  standardPrice: number | null;
  premiumPrice: number | null;
  sellerLevel: string;
  category: string;
  subcategory: string;
  sellerTotalReviews: number | null;
  createdAt: string;
  url: string;
}

export interface CategoryStat {
  name: string;
  count: number;
  avgPrice: number;
  totalReviews: number;
}
