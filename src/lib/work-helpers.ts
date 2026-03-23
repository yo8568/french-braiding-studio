import type { WorkFormData, ThreadRow, TechniqueRow } from "@/app/components/WorkFormSections";
import { createClient } from "@/lib/supabase";

/** Convert form data to the shape expected by supabase works table. */
export function buildWorkPayload(form: WorkFormData, imageUrls: string[]) {
  return {
    client_id: form.client_id || null,
    name: form.name,
    description: form.description || null,
    image_urls: imageUrls,
    price: form.price ? parseFloat(form.price) : null,
    inspiration: form.inspiration || null,
    meaning: form.meaning || null,
    special_notes: form.special_notes || null,
    flower_count: form.flower_count ? parseInt(form.flower_count) : 0,
    variation_count: form.variation_count ? parseInt(form.variation_count) : 0,
    status: form.status,
  };
}

/** Save work_threads rows for a given work. */
export async function saveWorkThreads(workId: string, rows: ThreadRow[]) {
  const supabase = createClient();
  const valid = rows.filter((t) => t.thread_id);
  if (valid.length === 0) return;
  await supabase.from("work_threads").insert(
    valid.map((t) => ({
      work_id: workId,
      thread_id: t.thread_id,
      length_cm: parseFloat(t.length_cm) || 0,
      quantity: parseInt(t.quantity) || 1,
    }))
  );
}

/** Save work_techniques rows for a given work. */
export async function saveWorkTechniques(workId: string, rows: TechniqueRow[]) {
  const supabase = createClient();
  const valid = rows.filter((t) => t.technique_id);
  if (valid.length === 0) return;
  await supabase.from("work_techniques").insert(
    valid.map((t) => ({
      work_id: workId,
      technique_id: t.technique_id,
      usage_count: parseInt(t.usage_count) || 1,
      notes: t.notes || null,
    }))
  );
}

/** Add a new client inline and return it. */
export async function addClient(name: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .insert({ name: name.trim() })
    .select()
    .single();
  return data;
}

/** Add a new thread inline and return it. */
export async function addThread(thread: {
  color_name: string;
  color_hex: string;
  material: string;
  thickness_mm: string;
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("threads")
    .insert({
      color_name: thread.color_name.trim(),
      color_hex: thread.color_hex,
      material: thread.material || null,
      thickness_mm: thread.thickness_mm ? parseFloat(thread.thickness_mm) : null,
    })
    .select()
    .single();
  return data;
}
