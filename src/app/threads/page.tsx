"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS, THREAD_SOURCE_PRESETS, THREAD_THICKNESS_OPTIONS } from "@/lib/constants";
import type { Thread } from "@/lib/types";
import Modal from "@/app/components/Modal";

export default function ThreadsPage() {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    color_name: "",
    color_hex: "#000000",
    material: "包芯棉",
    thickness_mm: "",
    source: "",
    price: "",
    stock_length_cm: "",
  });
  const [addStockId, setAddStockId] = useState<string | null>(null);
  const [addStockLength, setAddStockLength] = useState("");
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  usePageShow(() => {
    loadThreads();
  });

  async function loadThreads() {
    const { data } = await supabase
      .from("threads")
      .select("*")
      .order("color_name");
    setThreads((data as Thread[]) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ color_name: "", color_hex: "#000000", material: "包芯棉", thickness_mm: "", source: "", price: "", stock_length_cm: "" });
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
      price: thread.price?.toString() ?? "",
      stock_length_cm: thread.stock_length_cm?.toString() ?? "",
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
      price: form.price ? parseFloat(form.price) : null,
      stock_length_cm: form.stock_length_cm ? parseFloat(form.stock_length_cm) : 0,
    };

    if (editingId) {
      await supabase.from("threads").update(payload).eq("id", editingId);
    } else {
      await supabase.from("threads").insert(payload);
    }

    resetForm();
    loadThreads();
  }

  async function handleAddStock(threadId: string) {
    const length = parseFloat(addStockLength);
    if (!length || length <= 0) return;
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const newStock = (thread.stock_length_cm ?? 0) + length;
    await supabase.from("threads").update({ stock_length_cm: newStock }).eq("id", threadId);
    setAddStockId(null);
    setAddStockLength("");
    loadThreads();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這個線材嗎？已關聯的作品會失去此線材資訊。")) return;
    await supabase.from("threads").delete().eq("id", id);
    loadThreads();
  }

  function downloadCsvTemplate() {
    const csv = [
      "color_name,color_hex,material,thickness_mm,source,price,stock_length_cm",
      "酒紅色,#8B0000,蠟線,0.8,純清製線,120,500",
      "天藍色,#87CEEB,棉線,1.0,娜泥手作,90,300",
      "金色,#FFD700,尼龍,0.5,,60,",
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
      const priceIdx = headers.indexOf("price");
      const stockIdx = headers.indexOf("stock_length_cm");

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
          price: priceIdx !== -1 && cols[priceIdx] ? parseFloat(cols[priceIdx]) || null : null,
          stock_length_cm: stockIdx !== -1 && cols[stockIdx] ? parseFloat(cols[stockIdx]) || 0 : 0,
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

      {/* CSV Upload Modal */}
      <Modal open={showCsvUpload} onClose={() => { setShowCsvUpload(false); setCsvFile(null); setCsvResult(null); }} title="CSV 批次匯入">
        <div className="space-y-4">
          <div className="text-sm text-muted space-y-1">
            <p>CSV 格式：每行一筆線材，第一行為標題列。</p>
            <p>必填欄位：<code className="bg-background px-1 rounded">color_name</code></p>
            <p>
              選填欄位：
              <code className="bg-background px-1 rounded">color_hex</code>、
              <code className="bg-background px-1 rounded">material</code>、
              <code className="bg-background px-1 rounded">thickness_mm</code>、
              <code className="bg-background px-1 rounded">source</code>、
              <code className="bg-background px-1 rounded">price</code>、
              <code className="bg-background px-1 rounded">stock_length_cm</code>
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
              onClick={() => { setShowCsvUpload(false); setCsvFile(null); setCsvResult(null); }}
              className="border border-border px-6 py-2 rounded-lg hover:bg-card transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>

      {/* Form Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingId ? "編輯線材" : "新增線材"}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <select
                className={INPUT_CLASS}
                value={form.thickness_mm}
                onChange={(e) => setForm({ ...form, thickness_mm: e.target.value })}
              >
                <option value="">未選擇</option>
                {THREAD_THICKNESS_OPTIONS.map((v) => (
                  <option key={v} value={v.toString()}>{v} mm</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">來源</label>
              <input
                className={INPUT_CLASS}
                list="source-presets"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="選擇或自行輸入"
              />
              <datalist id="source-presets">
                {THREAD_SOURCE_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">購入價格 (NT$)</label>
              <input
                type="number"
                step="1"
                className={INPUT_CLASS}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="例：120"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">庫存線長 (cm)</label>
              <input
                type="number"
                step="0.1"
                className={INPUT_CLASS}
                value={form.stock_length_cm}
                onChange={(e) => setForm({ ...form, stock_length_cm: e.target.value })}
                placeholder="例：500"
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
      </Modal>

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無線材</div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-card border border-border rounded-xl p-4"
            >
              {/* Row 1: color + name + meta + actions */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: thread.color_hex }}
                  title={thread.color_hex}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{thread.color_name}</span>
                    {thread.material && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {thread.material}
                      </span>
                    )}
                    {thread.thickness_mm && (
                      <span className="text-xs text-muted">{thread.thickness_mm} mm</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                    {thread.source && <span>來源：{thread.source}</span>}
                    {thread.price && <span>價格：NT${thread.price}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(thread)}
                    className="text-primary hover:text-accent text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(thread.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    刪除
                  </button>
                </div>
              </div>

              {/* Row 2: stock */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm">
                  庫存：<span className="font-medium">{thread.stock_length_cm ? `${thread.stock_length_cm} cm` : "0 cm"}</span>
                </span>
                {addStockId === thread.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                      value={addStockLength}
                      onChange={(e) => setAddStockLength(e.target.value)}
                      placeholder="新增 cm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddStock(thread.id)}
                      className="text-sm text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700"
                    >
                      加入
                    </button>
                    <button
                      onClick={() => { setAddStockId(null); setAddStockLength(""); }}
                      className="text-sm text-muted hover:text-primary"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddStockId(thread.id)}
                    className="text-sm text-primary hover:text-accent"
                  >
                    + 補貨
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
