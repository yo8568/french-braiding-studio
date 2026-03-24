export interface Client {
  id: string;
  name: string;
  social_media_type: "ig" | "line" | "fb";
  social_media_id?: string;
  phone?: string;
  shipping_method?: "delivery" | "convenience_store";
  shipping_address?: string;
  store_name?: string;
  store_branch?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  order_id?: string;
  type: "feedback" | "inquiry" | "communication" | "other";
  content: string;
  image_urls: string[];
  created_at: string;
  // joined
  order?: Order;
}

export interface Order {
  id: string;
  client_id: string;
  shipping_method?: "delivery" | "convenience_store";
  shipping_address?: string;
  store_name?: string;
  store_branch?: string;
  total_amount?: number;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  notes?: string;
  created_at: string;
  // joined
  client?: Client;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  work_id: string;
  price: number;
  quantity: number;
  // joined
  work?: Work;
}

export interface Work {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  image_urls: string[];
  price?: number;
  inspiration?: string;
  meaning?: string;
  special_notes?: string;
  flower_count?: number;
  variation_count?: number;
  status: "in_progress" | "completed" | "for_sale" | "sold";
  created_at: string;
  updated_at: string;
  // joined
  client?: Client;
  work_threads?: WorkThread[];
  work_techniques?: WorkTechnique[];
}

export interface Thread {
  id: string;
  color_name: string;
  color_hex: string;
  material?: string;
  thickness_mm?: number;
  source?: string;
  price?: number;
  stock_length_cm?: number;
  created_at: string;
}

export interface WorkThread {
  id: string;
  work_id: string;
  thread_id: string;
  length_cm: number;
  quantity: number;
  notes?: string;
  thread?: Thread;
}

export interface Technique {
  id: string;
  name: string;
  description?: string;
  difficulty: number; // 1-5
  created_at: string;
}

export interface WorkTechnique {
  id: string;
  work_id: string;
  technique_id: string;
  usage_count: number;
  notes?: string;
  technique?: Technique;
}

export interface Feedback {
  id: string;
  page: string;
  category: "bug" | "suggestion" | "question" | "other";
  content: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at?: string;
}

export interface CordCalculation {
  knot_type: string;
  finished_length_cm: number;
  cord_count: number;
  multiplier: number;
  result_length_cm: number;
}
