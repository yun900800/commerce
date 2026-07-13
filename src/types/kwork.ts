/**
 * Kwork 数据模型
 * 对应 Kwork Mobile API (api.kwork.ru) 返回的数据结构
 */

/** Kwork 服务（卖家提供的服务） */
export interface KworkProject {
  id: number | null;
  title: string | null;
  url: string | null;
  price: number | null;
  isPriceFrom: boolean | null;
  categoryId: number | null;
  categoryName: string | null;
  statusId: number | null;
  statusName: string | null;
  photo: string | null;
  imageUrl: string | null;
  isBest: boolean | null;
  isHidden: boolean | null;
  isFavorite: boolean | null;
  lang: string | null;
  isSubscription: boolean | null;
  profileSort: number | null;

  /** 卖家信息 */
  worker: {
    id: number | null;
    username: string | null;
    fullname: string | null;
    profilepicture: string | null;
    rating: number | null;
    reviewsCount: number | null;
    ratingCount: number | null;
    isOnline: boolean | null;
  } | null;

  /** 活动数据（Kwork API 不返回 orders/views，保留结构但可能为 null） */
  activity: {
    views: number | null;
    orders: number | null;
    earned: number | null;
  } | null;

  /** 详情数据（只有 Top N 才有） */
  favoritesCount: number | null;
  ordersInQueue: number | null;

  badges: unknown[] | null;
  editsList: unknown[] | null;
}

/** 分类 */
export interface KworkCategory {
  id: number;
  name: string;
  description: string | null;
  subcategories?: KworkCategory[];
}

/** 用户 */
export interface KworkUser {
  id: number | null;
  username: string | null;
  fullname: string | null;
  profilepicture: string | null;
  rating: number | null;
  ratingCount: number | null;
  reviewsCount: number | null;
  goodReviews: number | null;
  badReviews: number | null;
  completedOrdersCount: number | null;
  levelDescription: string | null;
}

/** 评论 */
export interface KworkReview {
  id: number | null;
  timeAdded: number | null;
  text: string | null;
  good: boolean | null;
  bad: boolean | null;
  writer: {
    id: number | null;
    username: string | null;
    profilepicture: string | null;
  } | null;
}

/** JSON 文件结构 */
export interface KworkData {
  total: number;
  generatedAt: string;
  projects: KworkProject[];
}

/** UI 展示用的展开字段 */
export interface KworkProjectDisplay {
  rank: number;
  id: number | null;
  title: string;
  url: string;
  price: number | null;
  category: string;
  sellerUsername: string;
  sellerFullname: string | null;
  sellerRating: number | null;
  sellerReviewsCount: number | null;
  /** Kwork 详情接口返回的收藏数（仅 Top N 有此数据） */
  favoritesCount: number | null;
  /** Kwork 详情接口返回的队列中订单数（仅 Top N 有此数据） */
  ordersInQueue: number | null;
  isBest: boolean | null;
}

/** 分类统计 */
export interface KworkCategoryStat {
  name: string;
  count: number;
  avgPrice: number;
  totalReviews: number;
}
