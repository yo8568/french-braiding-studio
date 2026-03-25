import type { WorkFormData, ThreadRow, TechniqueRow, HardwareRow } from "@/app/components/WorkFormSections";
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
    memo: form.memo || null,
    flower_count: form.flower_count ? parseInt(form.flower_count) : 0,
    variation_count: form.variation_count ? parseInt(form.variation_count) : 0,
    status: form.status,
  };
}

/** Save work_threads rows. Only deducts stock if deductStock=true. */
export async function saveWorkThreads(workId: string, rows: ThreadRow[], deductStock = false) {
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
  if (deductStock) {
    await adjustThreadStock(valid, "deduct");
  }
}

/** Save work_hardware rows for a given work. */
export async function saveWorkHardware(workId: string, rows: HardwareRow[]) {
  const supabase = createClient();
  const valid = rows.filter((h) => h.hardware_id);
  if (valid.length === 0) return;
  await supabase.from("work_hardware").insert(
    valid.map((h) => ({
      work_id: workId,
      hardware_id: h.hardware_id,
      quantity: parseInt(h.quantity) || 1,
      notes: h.notes || null,
    }))
  );
}

/** Deduct stock for a work's current threads (used on ideation → in_progress transition). */
export async function deductStockForWork(workId: string) {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("work_threads")
    .select("thread_id, length_cm, quantity")
    .eq("work_id", workId);
  if (rows && rows.length > 0) {
    await adjustThreadStock(
      rows.map((r) => ({
        thread_id: r.thread_id,
        length_cm: r.length_cm.toString(),
        quantity: r.quantity.toString(),
      })),
      "deduct"
    );
  }
}

/** Deduct hardware stock for a work (used on ideation → in_progress transition). */
export async function deductHardwareStockForWork(workId: string) {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("work_hardware")
    .select("hardware_id, quantity")
    .eq("work_id", workId);
  if (rows && rows.length > 0) {
    await adjustHardwareStock(rows, "deduct");
  }
}

/** Restore hardware stock from work_hardware. */
export async function restoreHardwareStock(workId: string) {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("work_hardware")
    .select("hardware_id, quantity")
    .eq("work_id", workId);
  if (rows && rows.length > 0) {
    await adjustHardwareStock(rows, "restore");
  }
}

/** Adjust hardware stock_count: deduct or restore. */
async function adjustHardwareStock(
  rows: { hardware_id: string; quantity: number }[],
  direction: "deduct" | "restore"
) {
  const supabase = createClient();
  const usage: Record<string, number> = {};
  for (const r of rows) {
    usage[r.hardware_id] = (usage[r.hardware_id] || 0) + r.quantity;
  }
  for (const [hwId, amount] of Object.entries(usage)) {
    if (amount <= 0) continue;
    const { data: hw } = await supabase
      .from("hardware")
      .select("stock_count")
      .eq("id", hwId)
      .single();
    if (!hw) continue;
    const current = hw.stock_count ?? 0;
    const newStock = direction === "deduct"
      ? Math.max(0, current - amount)
      : current + amount;
    await supabase.from("hardware").update({ stock_count: newStock }).eq("id", hwId);
  }
}

/** Restore stock from work_threads (e.g. before re-saving or on delete). */
export async function restoreThreadStock(workId: string) {
  const supabase = createClient();
  const { data: oldRows } = await supabase
    .from("work_threads")
    .select("thread_id, length_cm, quantity")
    .eq("work_id", workId);
  if (oldRows && oldRows.length > 0) {
    await adjustThreadStock(
      oldRows.map((r) => ({
        thread_id: r.thread_id,
        length_cm: r.length_cm.toString(),
        quantity: r.quantity.toString(),
      })),
      "restore"
    );
  }
}

/** Adjust thread stock_length_cm: deduct or restore. */
async function adjustThreadStock(
  rows: { thread_id: string; length_cm: string; quantity: string }[],
  direction: "deduct" | "restore"
) {
  const supabase = createClient();
  const usage: Record<string, number> = {};
  for (const r of rows) {
    const amount = (parseFloat(r.length_cm) || 0) * (parseInt(r.quantity) || 1);
    usage[r.thread_id] = (usage[r.thread_id] || 0) + amount;
  }
  for (const [threadId, amount] of Object.entries(usage)) {
    if (amount <= 0) continue;
    const { data: thread } = await supabase
      .from("threads")
      .select("stock_length_cm")
      .eq("id", threadId)
      .single();
    if (!thread) continue;
    const current = thread.stock_length_cm ?? 0;
    const newStock = direction === "deduct"
      ? Math.max(0, current - amount)
      : current + amount;
    await supabase
      .from("threads")
      .update({ stock_length_cm: newStock })
      .eq("id", threadId);
  }
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
