-- 五金盤點
CREATE TABLE hardware_inventory_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hardware_id UUID REFERENCES hardware(id) ON DELETE CASCADE,
  expected_count INTEGER NOT NULL,
  actual_count INTEGER NOT NULL,
  diff INTEGER GENERATED ALWAYS AS (actual_count - expected_count) STORED,
  note TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  counted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hardware_inventory_counts_hardware_id
  ON hardware_inventory_counts(hardware_id);
CREATE INDEX idx_hardware_inventory_counts_counted_at
  ON hardware_inventory_counts(counted_at DESC);

ALTER TABLE hardware_inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hardware_inventory_counts
  FOR ALL USING (true) WITH CHECK (true);

-- 線材盤點
CREATE TABLE thread_inventory_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  expected_length_cm DECIMAL(10, 2) NOT NULL,
  actual_length_cm DECIMAL(10, 2) NOT NULL,
  diff_cm DECIMAL(10, 2) GENERATED ALWAYS AS (actual_length_cm - expected_length_cm) STORED,
  note TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  counted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_thread_inventory_counts_thread_id
  ON thread_inventory_counts(thread_id);
CREATE INDEX idx_thread_inventory_counts_counted_at
  ON thread_inventory_counts(counted_at DESC);

ALTER TABLE thread_inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON thread_inventory_counts
  FOR ALL USING (true) WITH CHECK (true);
