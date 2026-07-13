/**
 * Kwork 分类 ID → 英文名 映射表
 * 用于将 Kwork API 返回的俄语分类名翻译为英文
 */

export const CATEGORY_ENGLISH_NAMES: Record<number, string> = {
  // ─── Дизайн (Design) ───
  25: "Logos & Branding",
  24: "Web & Mobile Design",
  28: "Art & Illustrations",
  27: "Print Design",
  90: "Interior & Exterior Design",
  250: "Industrial Design",
  306: "AI Image Generation",
  270: "Presentations & Infographics",
  68: "Photo & Video Editing",
  272: "Outdoor Advertising",
  286: "Marketplaces & Social Media Design",

  // ─── Разработка и IT (Development & IT) ───
  38: "Site Refinement & Setup",
  37: "Website Development",
  41: "Scripts, Bots & Mini Apps",
  79: "HTML/CSS Layout",
  80: "Desktop Programming",
  39: "Mobile Apps",
  40: "Game Development",
  255: "Servers & Hosting",
  81: "Usability, Testing & Support",

  // ─── Тексты и переводы (Texts & Translations) ───
  235: "Resumes & Job Listings",
  75: "Data Entry & Typing",
  74: "Sales & Business Copywriting",
  73: "Website Content & Copy",
  35: "Translations",
  303: "AI Text Generation",

  // ─── SEO и трафик (SEO & Traffic) ───
  72: "Traffic Management",
  71: "Semantic Core & Keywords",
  59: "Link Building",
  56: "Statistics & Analytics",
  44: "SEO Audits & Consulting",
  43: "On-Page Optimization",
  273: "Top Website Promotion",

  // ─── Соцсети и маркетинг (Social Media & Marketing) ───
  113: "Databases & Lead Generation",
  112: "Marketplaces & Classifieds",
  108: "Email Marketing",
  49: "Contextual Advertising",
  47: "Marketing & PR",
  46: "Social Media & SMM",

  // ─── Аудио, видео, съемка (Audio, Video & Filming) ───
  106: "Audio Editing",
  78: "Video Production & Editing",
  77: "Intros & Logo Animation",
  76: "Video Commercials",
  23: "Music & Songs",
  20: "Audio Recording & Voiceover",
  300: "AI Video Generation",

  // ─── Бизнес и жизнь (Business & Lifestyle) ───
  114: "Website & Group Sales",
  84: "Personal Assistant",
  64: "Accounting & Taxes",
  63: "Legal Services",
  55: "Training & Consulting",
  262: "Cold Calling & Sales",
  265: "Recruitment & HR",
  65: "Construction & Repairs",
};

/** 获取分类英文名，如果找不到则返回原始俄语名 */
export function getCategoryEnglishName(categoryId: number | null, russianFallback?: string): string {
  if (categoryId != null && CATEGORY_ENGLISH_NAMES[categoryId]) {
    return CATEGORY_ENGLISH_NAMES[categoryId];
  }
  return russianFallback || "Uncategorized";
}
