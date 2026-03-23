"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
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
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

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

  function downloadCsvTemplate() {
    const csv = [
      "color_name,color_hex,material,thickness_mm,source",
      "酒紅色,#8B0000,蠟線,0.8,蝦皮",
      "天藍色,#87CEEB,棉線,1.0,手藝材料行",
      "金色,#FFD700,尼龍,0.5,",
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "threads_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvUpload() {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setCsvResult("CSV 檔案至少需要標題列和一行資料");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const nameIdx = headers.indexOf("color_name");
      const hexIdx = headers.indexOf("color_hex");
      const materialIdx = headers.indexOf("material");
      const thicknessIdx = headers.indexOf("thickness_mm");
      const sourceIdx = headers.indexOf("source");

      if (nameIdx === -1) {
        setCsvResult("CSV 缺少 color_name 欄位");
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const colorName = cols[nameIdx];
        if (!colorName) continue;

        rows.push({
          color_name: colorName,
          color_hex: hexIdx !== -1 && cols[hexIdx] ? cols[hexIdx] : "#000000",
          material: materialIdx !== -1 && cols[materialIdx] ? cols[materialIdx] : null,
          thickness_mm: thicknessIdx !== -1 && cols[thicknessIdx] ? parseFloat(cols[thicknessIdx]) || null : null,
          source: sourceIdx !== -1 && cols[sourceIdx] ? cols[sourceIdx] : null,
        });
      }

      if (rows.length === 0) {
        setCsvResult("沒有有效的資料行");
        return;
      }

      const { error } = await supabase.from("threads").insert(rows);
      if (error) {
        setCsvResult(`匯入失敗: ${error.message}`);
      } else {
        setCsvResult(`成功匯入 ${rows.length} 筆線材`);
        setCsvFile(null);
        setShowCsvUpload(false);
        loadThreads();
      }
    } catch {
      setCsvResult("CSV 解析失敗，請確認格式");
    } finally {
      setCsvUploading(false);
    }
  }

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">線材管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCsvUpload(!showCsvUpload);
              setShowForm(false);
            }}
            className="border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
          >
            CSV 匯入
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setShowCsvUpload(false);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            + 新增線材
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      {showCsvUpload && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-primary">CSV 批次匯入</h2>
          <div className="text-sm text-muted space-y-1">
            <p>CSV 格式：每行一筆線材，第一行為標題列。</p>
            <p>必填欄位：<code className="bg-background px-1 rounded">color_name</code></p>
            <p>
              選填欄位：
              <code className="bg-background px-1 rounded">color_hex</code>、
              <code className="bg-background px-1 rounded">material</code>、
              <code className="bg-background px-1 rounded">thickness_mm</code>、
              <code className="bg-background px-1 rounded">source</code>
            </p>
          </div>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="text-sm text-primary hover:text-accent underline"
          >
            下載 CSV 範例檔案
          </button>
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className={INPUT_CLASS}
            />
          </div>
          {csvResult && (
            <p className={`text-sm ${csvResult.includes("成功") ? "text-green-600" : "text-red-500"}`}>
              {csvResult}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCsvUpload}
              disabled={!csvFile || csvUploading}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {csvUploading ? "匯入中..." : "開始匯入"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCsvUpload(false);
                setCsvFile(null);
                setCsvResult(null);
              }}
              className="border border-border px-6 py-2 rounded-lg hover:bg-card transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
                value={form.thickness_mm}
                onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })}
                placeholder="例：0.8"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">來源</label>
              <input
                className={INPUT_CLASS}
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
