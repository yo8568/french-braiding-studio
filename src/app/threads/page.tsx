"use client";

import { useMemo, useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS, THREAD_SOURCE_PRESETS, THREAD_THICKNESS_OPTIONS } from "@/lib/constants";
import type { Thread, ThreadPurchase } from "@/lib/types";
import Modal from "@/app/components/Modal";
import Pagination, { paginate } from "@/app/components/Pagination";

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
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addStockId, setAddStockId] = useState<string | null>(null);
  const [addStockLength, setAddStockLength] = useState("");
  const [addStockPrice, setAddStockPrice] = useState("");
  const [purchases, setPurchases] = useState<Record<string, ThreadPurchase[]>>({});
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<{ id: string; threadId: string; length_cm: string; price: string } | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  usePageShow(() => {
    loadThreads();
  });

  async function loadThreads() {
    const [threadsRes, purchasesRes] = await Promise.all([
      supabase.from("threads").select("*").order("color_name"),
      supabase.from("thread_purchases").select("*").order("created_at", { ascending: false }),
    ]);
    setThreads((threadsRes.data as Thread[]) ?? []);
    // Group purchases by thread_id
    const grouped: Record<string, ThreadPurchase[]> = {};
    for (const p of (purchasesRes.data as ThreadPurchase[]) ?? []) {
      (grouped[p.thread_id] ??= []).push(p);
    }
    setPurchases(grouped);
    setLoading(false);
  }

  function resetForm() {
    setForm({ color_name: "", color_hex: "#000000", material: "包芯棉", thickness_mm: "", source: "" });
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

  function togglePurchaseLog(threadId: string) {
    setExpandedPurchaseId(expandedPurchaseId === threadId ? null : threadId);
  }

  async function handleEditPurchase() {
    if (!editingPurchase) return;
    const length = parseFloat(editingPurchase.length_cm);
    const price = parseFloat(editingPurchase.price);
    if (!length || length <= 0 || !price || price <= 0) return;

    await supabase.from("thread_purchases").update({ length_cm: length, price }).eq("id", editingPurchase.id);
    const tid = editingPurchase.threadId;
    setEditingPurchase(null);
    setExpandedPurchaseId(tid);
    loadThreads();
  }

  async function handleDeletePurchase(purchase: ThreadPurchase) {
    if (!confirm("確定要刪除這筆進貨紀錄？")) return;
    await supabase.from("thread_purchases").delete().eq("id", purchase.id);
    setExpandedPurchaseId(purchase.thread_id);
    loadThreads();
  }

  async function handleAddStock(threadId: string) {
    const length = parseFloat(addStockLength);
    const price = parseFloat(addStockPrice);
    if (!length || length <= 0 || !price || price <= 0) return;
    await supabase.from("thread_purchases").insert({
      thread_id: threadId,
      length_cm: length,
      price,
    });
    setAddStockId(null);
    setAddStockLength("");
    setAddStockPrice("");
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

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.trim().toLowerCase();
    return threads.filter(
      (t) =>
        t.color_name.toLowerCase().includes(q) ||
        (t.material?.toLowerCase().includes(q)) ||
        (t.source?.toLowerCase().includes(q)) ||
        t.color_hex.toLowerCase().includes(q)
    );
  }, [threads, search]);

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

      {/* Search */}
      <div className="mb-6">
        <input
          className={INPUT_CLASS}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜尋顏色、材質、來源..."
        />
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
      {filteredThreads.length === 0 ? (
        <div className="text-center py-16 text-muted">{search ? "無符合結果" : "尚無線材"}</div>
      ) : (() => {
        const { paged: pagedThreads, totalPages } = paginate(filteredThreads, page);
        return (<>
        <div className="space-y-3">
          {pagedThreads.map((thread) => (
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
                  {(() => {
                    const ps = purchases[thread.id] ?? [];
                    const totalLen = ps.reduce((s, p) => s + p.length_cm, 0);
                    const totalSpent = ps.reduce((s, p) => s + p.price, 0);
                    const avg = totalLen > 0 ? totalSpent / totalLen : 0;
                    return (<>
                      庫存：<span className="font-medium">{totalLen ? `${totalLen} cm` : "0 cm"}</span>
                      {avg > 0 && <span className="text-muted ml-2">（均價 {avg.toFixed(2)} /cm）</span>}
                    </>);
                  })()}
                </span>
                {addStockId === thread.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                      value={addStockLength}
                      onChange={(e) => setAddStockLength(e.target.value)}
                      placeholder="長度 cm"
                      autoFocus
                    />
                    <input
                      type="number"
                      step="1"
                      className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                      value={addStockPrice}
                      onChange={(e) => setAddStockPrice(e.target.value)}
                      placeholder="價格 NT$"
                    />
                    <button
                      onClick={() => handleAddStock(thread.id)}
                      className="text-sm text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700"
                    >
                      加入
                    </button>
                    <button
                      onClick={() => { setAddStockId(null); setAddStockLength(""); setAddStockPrice(""); }}
                      className="text-sm text-muted hover:text-primary"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePurchaseLog(thread.id)}
                      className="text-xs text-muted hover:text-primary"
                    >
                      {expandedPurchaseId === thread.id ? "隱藏紀錄 ▲" : "進貨紀錄 ▼"}
                    </button>
                    <button
                      onClick={() => setAddStockId(thread.id)}
                      className="text-sm text-primary hover:text-accent"
                    >
                      + 補貨
                    </button>
                  </div>
                )}
              </div>

              {/* Purchase log */}
              {expandedPurchaseId === thread.id && (
                <div className="mt-2 pt-2 border-t border-border">
                  {(!purchases[thread.id] || purchases[thread.id].length === 0) ? (
                    <p className="text-xs text-muted">尚無進貨紀錄</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-muted gap-3 px-2">
                        <span className="w-24">日期</span>
                        <span className="w-20 text-right">長度</span>
                        <span className="w-20 text-right">價格</span>
                        <span className="w-20 text-right">單價/cm</span>
                        <span className="w-16 text-right">操作</span>
                      </div>
                      {purchases[thread.id].map((p) =>
                        editingPurchase?.id === p.id ? (
                          <div key={p.id} className="flex items-center text-xs gap-2 px-2 py-1 bg-background rounded">
                            <span className="w-24 text-muted">{new Date(p.created_at).toLocaleDateString("zh-TW")}</span>
                            <input
                              type="number" step="0.1"
                              className="w-20 border border-border rounded px-1 py-0.5 text-right bg-card"
                              value={editingPurchase.length_cm}
                              onChange={(e) => setEditingPurchase({ ...editingPurchase, length_cm: e.target.value })}
                            />
                            <input
                              type="number" step="1"
                              className="w-20 border border-border rounded px-1 py-0.5 text-right bg-card"
                              value={editingPurchase.price}
                              onChange={(e) => setEditingPurchase({ ...editingPurchase, price: e.target.value })}
                            />
                            <button onClick={handleEditPurchase} className="text-green-600 hover:text-green-700">儲存</button>
                            <button onClick={() => setEditingPurchase(null)} className="text-muted hover:text-primary">取消</button>
                          </div>
                        ) : (
                          <div key={p.id} className="flex items-center text-xs gap-3 px-2 py-1 rounded hover:bg-background">
                            <span className="w-24 text-muted">
                              {new Date(p.created_at).toLocaleDateString("zh-TW")}
                            </span>
                            <span className="w-20 text-right">{p.length_cm} cm</span>
                            <span className="w-20 text-right">NT${p.price}</span>
                            <span className="w-20 text-right text-muted">
                              {(p.price / p.length_cm).toFixed(2)}/cm
                            </span>
                            <span className="w-16 text-right flex gap-1 justify-end">
                              <button
                                onClick={() => setEditingPurchase({ id: p.id, threadId: thread.id, length_cm: p.length_cm.toString(), price: p.price.toString() })}
                                className="text-primary hover:text-accent"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(p)}
                                className="text-red-400 hover:text-red-600"
                              >
                                刪除
                              </button>
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>);
      })()}
    </div>
  );
}
