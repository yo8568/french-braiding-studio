-- =============================================
-- French Braiding Studio - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 客戶
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  social_media_type TEXT NOT NULL DEFAULT 'ig' CHECK (social_media_type IN ('ig', 'line', 'fb')),
  social_media_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 作品
CREATE TABLE works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  price DECIMAL(10, 2),
  inspiration TEXT,
  meaning TEXT,
  special_notes TEXT,
  flower_count INTEGER DEFAULT 0,
  variation_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'for_sale', 'sold')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 線材
CREATE TABLE threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#000000',
  material TEXT,
  thickness_mm DECIMAL(3, 1),
  source TEXT,
  price DECIMAL(10, 2),
  stock_length_cm DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 作品用線（多對多）
CREATE TABLE work_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  length_cm DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT
);

-- 編法
CREATE TABLE techniques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 作品編法（多對多）
CREATE TABLE work_techniques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  technique_id UUID REFERENCES techniques(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 1,
  notes TEXT
);

-- 繩長計算預設
CREATE TABLE cord_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knot_type TEXT NOT NULL,
  multiplier DECIMAL(4, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER works_updated_at
  BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 建立索引
CREATE INDEX idx_works_client ON works(client_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_work_threads_work ON work_threads(work_id);
CREATE INDEX idx_work_techniques_work ON work_techniques(work_id);

-- 預設編法資料
INSERT INTO techniques (name, description, difficulty) VALUES
  ('平結', '基本的平結編法', 1),
  ('雀頭結', '常用於起始和裝飾', 1),
  ('螺旋結', '旋轉的螺旋效果', 2),
  ('蛇結', '類似蛇身的編織', 2),
  ('金剛結', '堅固的裝飾結', 3),
  ('鳳梨結', '立體的鳳梨造型', 3),
  ('中國結', '傳統中式結藝', 4),
  ('花朵結', '花朵造型裝飾', 3),
  ('菱形編', '菱形圖案編織', 4),
  ('纏繞編', '線材纏繞技法', 2);

-- 預設繩長倍率
INSERT INTO cord_presets (knot_type, multiplier, description) VALUES
  ('平結', 4.0, '成品長度 x 4 = 所需繩長'),
  ('螺旋結', 5.0, '成品長度 x 5 = 所需繩長'),
  ('雀頭結', 3.5, '成品長度 x 3.5 = 所需繩長'),
  ('蛇結', 6.0, '成品長度 x 6 = 所需繩長'),
  ('金剛結', 5.5, '成品長度 x 5.5 = 所需繩長'),
  ('中國結', 7.0, '成品長度 x 7 = 所需繩長'),
  ('纏繞編', 3.0, '成品長度 x 3 = 所需繩長');

-- 意見回饋
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'suggestion' CHECK (category IN ('bug', 'suggestion', 'question', 'other')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_page ON feedback(page);

-- Storage bucket for images (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('work-images', 'work-images', true);

-- RLS Policies (permissive for now - no auth required)
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE cord_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON work_threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON techniques FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON work_techniques FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cord_presets FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON feedback FOR ALL USING (true) WITH CHECK (true);
