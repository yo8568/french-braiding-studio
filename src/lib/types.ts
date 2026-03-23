export interface Client {
  id: string;
  name: string;
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
  type: "feedback" | "inquiry" | "communication" | "other";
  content: string;
  image_urls: string[];
  created_at: string;
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

export interface CordCalculation {
  knot_type: string;
  finished_length_cm: number;
  cord_count: number;
  multiplier: number;
  result_length_cm: number;
}
