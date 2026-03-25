"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Hardware, HardwarePurchase } from "@/lib/types";
import Modal from "@/app/components/Modal";
import Pagination, { paginate } from "@/app/components/Pagination";

export default function HardwarePage() {
  const supabase = createClient();
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // Stock management
  const [addStockId, setAddStockId] = useState<string | null>(null);
  const [addStockQty, setAddStockQty] = useState("");
  const [addStockPrice, setAddStockPrice] = useState("");
  const [purchases, setPurchases] = useState<Record<string, HardwarePurchase[]>>({});
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<{ id: string; hardwareId: string; quantity: string; price: string } | null>(null);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [hwRes, purchasesRes] = await Promise.all([
      supabase.from("hardware").select("*").order("name"),
      supabase.from("hardware_purchases").select("*").order("created_at", { ascending: false }),
    ]);
    setHardware((hwRes.data as Hardware[]) ?? []);
    const grouped: Record<string, HardwarePurchase[]> = {};
    for (const p of (purchasesRes.data as HardwarePurchase[]) ?? []) {
      (grouped[p.hardware_id] ??= []).push(p);
    }
    setPurchases(grouped);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(h: Hardware) {
    setForm({
      name: h.name,
      description: h.description ?? "",
    });
    setEditingId(h.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
    };
    if (editingId) {
      await supabase.from("hardware").update(payload).eq("id", editingId);
    } else {
      await supabase.from("hardware").insert(payload);
    }
    resetForm();
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這個五金嗎？")) return;
    await supabase.from("hardware").delete().eq("id", id);
    loadAll();
  }

  // Stock add
  async function handleAddStock(hardwareId: string) {
    const qty = parseInt(addStockQty);
    const price = parseFloat(addStockPrice);
    if (!qty || qty <= 0 || !price || price <= 0) return;
    await supabase.from("hardware_purchases").insert({ hardware_id: hardwareId, quantity: qty, price });
    setAddStockId(null);
    setAddStockQty("");
    setAddStockPrice("");
    loadAll();
  }

  // Purchase edit
  async function handleEditPurchase() {
    if (!editingPurchase) return;
    const qty = parseInt(editingPurchase.quantity);
    const price = parseFloat(editingPurchase.price);
    if (!qty || qty <= 0 || !price || price <= 0) return;
    await supabase.from("hardware_purchases").update({ quantity: qty, price }).eq("id", editingPurchase.id);
    setEditingPurchase(null);
    loadAll();
  }

  // Purchase delete
  async function handleDeletePurchase(purchase: HardwarePurchase) {
    if (!confirm("確定要刪除這筆進貨紀錄？")) return;
    await supabase.from("hardware_purchases").delete().eq("id", purchase.id);
    loadAll();
  }

  function togglePurchaseLog(id: string) {
    setExpandedPurchaseId(expandedPurchaseId === id ? null : id);
  }

  function getPurchaseStats(hwId: string) {
    const ps = purchases[hwId];
    if (!ps?.length) return { totalQty: 0, avgPrice: 0 };
    const totalSpent = ps.reduce((s, p) => s + p.price, 0);
    const totalQty = ps.reduce((s, p) => s + p.quantity, 0);
    return { totalQty, avgPrice: totalQty > 0 ? totalSpent / totalQty : 0 };
  }

  const filtered = hardware.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">五金管理</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增五金
        </button>
      </div>

      <div className="mb-6">
        <input
          className={INPUT_CLASS}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜尋五金名稱..."
        />
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingId ? "編輯五金" : "新增五金"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">名稱 *</label>
            <input required className={INPUT_CLASS} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例：D扣" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea className={INPUT_CLASS} rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="五金說明..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-accent transition-colors">
              {editingId ? "更新" : "新增"}
            </button>
            <button type="button" onClick={resetForm} className="border border-border px-6 py-2 rounded-lg hover:bg-card transition-colors">
              取消
            </button>
          </div>
        </form>
      </Modal>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">{search ? "找不到符合的五金" : "尚無五金"}</div>
      ) : (() => {
        const { paged, totalPages } = paginate(filtered, page);
        return (<>
        <div className="space-y-3">
          {paged.map((h) => {
            const { totalQty, avgPrice } = getPurchaseStats(h.id);
            return (
              <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                {/* Row 1: info + actions */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{h.name}</span>
                    </div>
                    {h.description && (
                      <p className="text-sm text-muted mt-1">{h.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleEdit(h)} className="text-primary hover:text-accent text-sm">編輯</button>
                    <button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-600 text-sm">刪除</button>
                  </div>
                </div>

                {/* Row 2: stock */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm">
                    庫存：<span className="font-medium">{totalQty} 個</span>
                    {avgPrice > 0 && <span className="text-muted ml-2">（均價 {avgPrice.toFixed(1)} /個）</span>}
                  </span>
                  {addStockId === h.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" step="1" className="w-20 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                        value={addStockQty} onChange={(e) => setAddStockQty(e.target.value)} placeholder="數量" autoFocus />
                      <input type="number" step="1" className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                        value={addStockPrice} onChange={(e) => setAddStockPrice(e.target.value)} placeholder="價格 NT$" />
                      <button onClick={() => handleAddStock(h.id)}
                        className="text-sm text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700">加入</button>
                      <button onClick={() => { setAddStockId(null); setAddStockQty(""); setAddStockPrice(""); }}
                        className="text-sm text-muted hover:text-primary">取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => togglePurchaseLog(h.id)} className="text-xs text-muted hover:text-primary">
                        {expandedPurchaseId === h.id ? "隱藏紀錄 ▲" : "進貨紀錄 ▼"}
                      </button>
                      <button onClick={() => setAddStockId(h.id)} className="text-sm text-primary hover:text-accent">+ 補貨</button>
                    </div>
                  )}
                </div>

                {/* Purchase log */}
                {expandedPurchaseId === h.id && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {(!purchases[h.id] || purchases[h.id].length === 0) ? (
                      <p className="text-xs text-muted">尚無進貨紀錄</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-muted gap-3 px-2">
                          <span className="w-24">日期</span>
                          <span className="w-16 text-right">數量</span>
                          <span className="w-20 text-right">價格</span>
                          <span className="w-20 text-right">單價/個</span>
                          <span className="w-16 text-right">操作</span>
                        </div>
                        {purchases[h.id].map((p) =>
                          editingPurchase?.id === p.id ? (
                            <div key={p.id} className="flex items-center text-xs gap-2 px-2 py-1 bg-background rounded">
                              <span className="w-24 text-muted">{new Date(p.created_at).toLocaleDateString("zh-TW")}</span>
                              <input type="number" step="1" className="w-16 border border-border rounded px-1 py-0.5 text-right bg-card"
                                value={editingPurchase.quantity} onChange={(e) => setEditingPurchase({ ...editingPurchase, quantity: e.target.value })} />
                              <input type="number" step="1" className="w-20 border border-border rounded px-1 py-0.5 text-right bg-card"
                                value={editingPurchase.price} onChange={(e) => setEditingPurchase({ ...editingPurchase, price: e.target.value })} />
                              <button onClick={handleEditPurchase} className="text-green-600 hover:text-green-700">儲存</button>
                              <button onClick={() => setEditingPurchase(null)} className="text-muted hover:text-primary">取消</button>
                            </div>
                          ) : (
                            <div key={p.id} className="flex items-center text-xs gap-3 px-2 py-1 rounded hover:bg-background">
                              <span className="w-24 text-muted">{new Date(p.created_at).toLocaleDateString("zh-TW")}</span>
                              <span className="w-16 text-right">{p.quantity} 個</span>
                              <span className="w-20 text-right">NT${p.price}</span>
                              <span className="w-20 text-right text-muted">{(p.price / p.quantity).toFixed(1)}/個</span>
                              <span className="w-16 text-right flex gap-1 justify-end">
                                <button onClick={() => setEditingPurchase({ id: p.id, hardwareId: h.id, quantity: p.quantity.toString(), price: p.price.toString() })}
                                  className="text-primary hover:text-accent">編輯</button>
                                <button onClick={() => handleDeletePurchase(p)} className="text-red-400 hover:text-red-600">刪除</button>
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>);
      })()}
    </div>
  );
}
