// Shared CSS class for form inputs
export const INPUT_CLASS =
  "w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

// Work status labels
export const WORK_STATUS_LABELS: Record<string, string> = {
  in_progress: "製作中",
  completed: "已完成",
  for_sale: "販售中",
  sold: "已售出",
};

// Order status labels and colors
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待出貨",
  shipped: "已寄送",
  delivered: "已送達",
  cancelled: "已取消",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// Shipping labels
export const SHIPPING_LABELS: Record<string, string> = {
  delivery: "宅配",
  convenience_store: "超商取貨",
};

// Note type labels
export const NOTE_TYPE_LABELS: Record<string, string> = {
  feedback: "回饋",
  inquiry: "詢問",
  communication: "溝通",
  other: "其他",
};

// Feedback category labels
export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  bug: "問題回報",
  suggestion: "建議",
  question: "提問",
  other: "其他",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  open: "待處理",
  resolved: "已解決",
};

export const FEEDBACK_STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

// Social media labels
export const SOCIAL_MEDIA_LABELS: Record<string, string> = {
  ig: "Instagram",
  line: "LINE",
  fb: "Facebook",
};

// Thread thickness options (mm)
export const THREAD_THICKNESS_OPTIONS = [3, 3.5, 4, 5, 6];

// Thread source presets
export const THREAD_SOURCE_PRESETS = ["純清製線", "娜泥手作"];

// Convenience store options
export const CONVENIENCE_STORES = ["7-ELEVEN", "全家", "萊爾富", "OK超商"];
