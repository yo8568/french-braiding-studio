"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Thread } from "@/lib/types";

export default function ThreadsPage() {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    color_name: "",
    color_hex: "#000000",
    material: "",
    thickness_mm: "",
    source: "",
  });

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadThreads() {
    const { data } = await supabase
      .from("threads")
      .select("*")
      .order("color_name");
    setThreads((data as Thread[]) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ color_name: "", color_hex: "#000000", material: "", thickness_mm: "", source: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(thread: Thread) {
    setForm({
      color_name: thread.color_name,
      color_hex: thread.color_hex,
      material: thread.material ?? "",
      thickness_mm: thread.thickness_mm?.toString() ?? "",
      source: thread.source ?? "",
    });
    setEditingId(thread.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.color_name.trim()) return;

    const payload = {
      color_name: form.color_name.trim(),
      color_hex: form.color_hex,
      material: form.material || null,
      thickness_mm: form.thickness_mm ? parseFloat(form.thickness_mm) : null,
      source: form.source || null,
    };

    if (editingId) {
      await supabase.from("threads").update(payload).eq("id", editingId);
    } else {
      await supabase.from("threads").insert(payload);
    }

    resetForm();
    loadThreads();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這個線材嗎？已關聯的作品會失去此線材資訊。")) return;
    await supabase.from("threads").delete().eq("id", id);
    loadThreads();
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">線材管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增線材
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4"
        >
          <h2 className="text-xl font-semibold text-primary">
            {editingId ? "編輯線材" : "新增線材"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">顏色名稱 *</label>
              <input
                required
                className={inputClass}
                value={form.color_name}
                onChange={(e) => setForm({ ...form, color_name: e.target.value })}
                placeholder="例：酒紅色"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">顏色</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={form.color_hex}
                  onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <span className="text-sm text-muted">{form.color_hex}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">材質</label>
              <input
                className={inputClass}
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                placeholder="例：蠟線、棉線、尼龍"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">粗細 (mm)</label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={form.thickness_mm}
                onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })}
                placeholder="例：0.8"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">來源</label>
              <input
                className={inputClass}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="例：蝦皮、手藝材料行、朋友送的"
              />
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
      )}

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無線材</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-sm font-medium">顏色</th>
                <th className="text-left px-4 py-3 text-sm font-medium">名稱</th>
                <th className="text-left px-4 py-3 text-sm font-medium">材質</th>
                <th className="text-left px-4 py-3 text-sm font-medium">粗細</th>
                <th className="text-left px-4 py-3 text-sm font-medium">來源</th>
                <th className="text-right px-4 py-3 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr
                  key={thread.id}
                  className="border-b border-border last:border-0 hover:bg-background/50"
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-full border border-border"
                      style={{ backgroundColor: thread.color_hex }}
                      title={thread.color_hex}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{thread.color_name}</td>
                  <td className="px-4 py-3 text-muted">{thread.material ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {thread.thickness_mm ? `${thread.thickness_mm} mm` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{thread.source ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(thread)}
                      className="text-primary hover:text-accent text-sm mr-3"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(thread.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
