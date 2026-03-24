"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Technique } from "@/lib/types";
import Modal from "@/app/components/Modal";

export default function TechniquesPage() {
  const supabase = createClient();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    difficulty: "1",
    cord_count: "3",
    knot_length_cm: "",
    cord1_multiplier: "",
    cord2_multiplier: "",
    cord3_multiplier: "",
  });

  usePageShow(() => {
    loadTechniques();
  });

  async function loadTechniques() {
    const { data } = await supabase
      .from("techniques")
      .select("*")
      .order("name");
    setTechniques((data as Technique[]) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", description: "", difficulty: "1", cord_count: "3", knot_length_cm: "", cord1_multiplier: "", cord2_multiplier: "", cord3_multiplier: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(t: Technique) {
    setForm({
      name: t.name,
      description: t.description ?? "",
      difficulty: t.difficulty.toString(),
      cord_count: t.cord_count?.toString() ?? "3",
      knot_length_cm: t.knot_length_cm?.toString() ?? "",
      cord1_multiplier: t.cord1_multiplier?.toString() ?? "",
      cord2_multiplier: t.cord2_multiplier?.toString() ?? "",
      cord3_multiplier: t.cord3_multiplier?.toString() ?? "",
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const cordCount = parseInt(form.cord_count) || 3;
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      difficulty: parseInt(form.difficulty) || 1,
      cord_count: cordCount,
      knot_length_cm: form.knot_length_cm ? parseFloat(form.knot_length_cm) : null,
      cord1_multiplier: form.cord1_multiplier ? parseFloat(form.cord1_multiplier) : null,
      cord2_multiplier: cordCount >= 2 && form.cord2_multiplier ? parseFloat(form.cord2_multiplier) : null,
      cord3_multiplier: cordCount >= 3 && form.cord3_multiplier ? parseFloat(form.cord3_multiplier) : null,
    };

    if (editingId) {
      await supabase.from("techniques").update(payload).eq("id", editingId);
    } else {
      await supabase.from("techniques").insert(payload);
    }

    resetForm();
    loadTechniques();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這個編法嗎？")) return;
    await supabase.from("techniques").delete().eq("id", id);
    loadTechniques();
  }

  const difficultyLabel = (d: number) => "★".repeat(d) + "☆".repeat(5 - d);

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">編法管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增編法
        </button>
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingId ? "編輯編法" : "新增編法"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">名稱 *</label>
            <input
              required
              className={INPUT_CLASS}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例：平結"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea
              className={INPUT_CLASS}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="編法說明..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">難度 (1-5)</label>
              <select
                className={INPUT_CLASS}
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {d} — {difficultyLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">線數</label>
              <select
                className={INPUT_CLASS}
                value={form.cord_count}
                onChange={(e) => setForm({ ...form, cord_count: e.target.value })}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n} 條線</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">一個結的長度 (cm)</label>
            <input
              type="number"
              step="0.1"
              className={INPUT_CLASS}
              value={form.knot_length_cm}
              onChange={(e) => setForm({ ...form, knot_length_cm: e.target.value })}
              placeholder="例：0.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">每條線倍率</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">線 1</label>
                <input
                  type="number"
                  step="0.1"
                  className={INPUT_CLASS}
                  value={form.cord1_multiplier}
                  onChange={(e) => setForm({ ...form, cord1_multiplier: e.target.value })}
                  placeholder="倍率"
                />
              </div>
              {parseInt(form.cord_count) >= 2 && (
                <div>
                  <label className="block text-xs text-muted mb-1">線 2</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={form.cord2_multiplier}
                    onChange={(e) => setForm({ ...form, cord2_multiplier: e.target.value })}
                    placeholder="倍率"
                  />
                </div>
              )}
              {parseInt(form.cord_count) >= 3 && (
                <div>
                  <label className="block text-xs text-muted mb-1">線 3</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={form.cord3_multiplier}
                    onChange={(e) => setForm({ ...form, cord3_multiplier: e.target.value })}
                    placeholder="倍率"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              {editingId ? "更新" : "新增"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border border-border px-6 py-2 rounded-lg hover:bg-card transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>

      {/* List */}
      {techniques.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無編法</div>
      ) : (
        <div className="space-y-3">
          {techniques.map((t) => (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-sm text-yellow-600">{difficultyLabel(t.difficulty)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t.cord_count} 條線
                  </span>
                  {t.knot_length_cm && (
                    <span className="text-xs text-muted">結長 {t.knot_length_cm} cm</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                  {t.description && <span>{t.description}</span>}
                  {(t.cord1_multiplier || t.cord2_multiplier || t.cord3_multiplier) && (
                    <span>
                      倍率：{[t.cord1_multiplier, t.cord2_multiplier, t.cord3_multiplier]
                        .slice(0, t.cord_count)
                        .map((m, i) => `線${i + 1}×${m ?? 0}`)
                        .join(" / ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleEdit(t)}
                  className="text-primary hover:text-accent text-sm"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
