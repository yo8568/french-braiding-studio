"use client";

import { useMemo, useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Hardware, HardwarePurchase, HardwareInventoryCount } from "@/lib/types";

type InputState = { actual: string; note: string };

export default function HardwareInventoryPage() {
  const supabase = createClient();
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [purchases, setPurchases] = useState<Record<string, HardwarePurchase[]>>({});
  const [counts, setCounts] = useState<HardwareInventoryCount[]>([]);
  const [inputs, setInputs] = useState<Record<string, InputState>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [hwRes, purchasesRes, countsRes] = await Promise.all([
      supabase.from("hardware").select("*").order("name"),
      supabase.from("hardware_purchases").select("*"),
      supabase
        .from("hardware_inventory_counts")
        .select("*, hardware(*)")
        .order("counted_at", { ascending: false })
        .limit(50),
    ]);
    setHardware((hwRes.data as Hardware[]) ?? []);
    const grouped: Record<string, HardwarePurchase[]> = {};
    for (const p of (purchasesRes.data as HardwarePurchase[]) ?? []) {
      (grouped[p.hardware_id] ??= []).push(p);
    }
    setPurchases(grouped);
    setCounts((countsRes.data as HardwareInventoryCount[]) ?? []);
    setLoading(false);
  }

  function expectedOf(hwId: string): number {
    const ps = purchases[hwId] ?? [];
    return ps.reduce((s, p) => s + p.quantity, 0);
  }

  function getInput(hwId: string): InputState {
    return inputs[hwId] ?? { actual: "", note: "" };
  }

  function setInput(hwId: string, patch: Partial<InputState>) {
    setInputs((prev) => ({ ...prev, [hwId]: { ...getInput(hwId), ...patch } }));
  }

  async function handleSave(h: Hardware) {
    const { actual, note } = getInput(h.id);
    const actualNum = parseInt(actual);
    if (isNaN(actualNum) || actualNum < 0) return;
    const expected = expectedOf(h.id);
    setSavingId(h.id);
    const { error } = await supabase.from("hardware_inventory_counts").insert({
      hardware_id: h.id,
      expected_count: expected,
      actual_count: actualNum,
      note: note.trim() || null,
    });
    setSavingId(null);
    if (error) {
      alert("儲存失敗: " + error.message);
      return;
    }
    setInputs((prev) => ({ ...prev, [h.id]: { actual: "", note: "" } }));
    loadAll();
  }

  async function handleApply(c: HardwareInventoryCount) {
    if (c.applied) return;
    if (!confirm(`套用後會新增一筆盤點調整（${c.diff > 0 ? "+" : ""}${c.diff}）以同步系統庫存，確定？`)) return;
    if (c.diff !== 0) {
      const { error: pErr } = await supabase.from("hardware_purchases").insert({
        hardware_id: c.hardware_id,
        quantity: c.diff,
        price: 0,
        note: `盤點調整（實際 ${c.actual_count} / 系統 ${c.expected_count}）`,
      });
      if (pErr) {
        alert("套用失敗: " + pErr.message);
        return;
      }
    }
    const { error } = await supabase
      .from("hardware_inventory_counts")
      .update({ applied: true })
      .eq("id", c.id);
    if (error) {
      alert("狀態更新失敗: " + error.message);
      return;
    }
    loadAll();
  }

  async function handleDeleteCount(c: HardwareInventoryCount) {
    if (c.applied) {
      if (!confirm("此筆已套用，刪除僅移除紀錄、不會還原調整，確定？")) return;
    } else {
      if (!confirm("確定刪除這筆盤點紀錄？")) return;
    }
    await supabase.from("hardware_inventory_counts").delete().eq("id", c.id);
    loadAll();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return hardware;
    const q = search.trim().toLowerCase();
    return hardware.filter((h) => h.name.toLowerCase().includes(q));
  }, [hardware, search]);

  if (loading) return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">五金盤點</h1>
        <a href="/hardware" className="text-sm text-muted hover:text-primary">← 返回五金管理</a>
      </div>

      <div className="mb-6">
        <input
          className={INPUT_CLASS}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋五金名稱..."
        />
      </div>

      <h2 className="text-lg font-semibold mb-3">本次盤點</h2>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">{search ? "找不到符合的五金" : "尚無五金"}</div>
      ) : (
        <div className="space-y-3 mb-10">
          {filtered.map((h) => {
            const expected = expectedOf(h.id);
            const input = getInput(h.id);
            const actualNum = parseInt(input.actual);
            const validActual = !isNaN(actualNum) && actualNum >= 0;
            const diff = validActual ? actualNum - expected : 0;
            return (
              <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{h.name}</div>
                    {h.description && <p className="text-sm text-muted mt-1">{h.description}</p>}
                  </div>
                  <span className="text-sm text-muted shrink-0">系統庫存：<span className="font-medium text-foreground">{expected} 個</span></span>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  <label className="text-sm text-muted">實際清點</label>
                  <input
                    type="number" step="1" min="0"
                    className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                    value={input.actual}
                    onChange={(e) => setInput(h.id, { actual: e.target.value })}
                    placeholder="個"
                  />
                  {validActual && (
                    <span className={`text-sm font-medium ${diff === 0 ? "text-muted" : diff > 0 ? "text-green-600" : "text-red-500"}`}>
                      差異 {diff > 0 ? "+" : ""}{diff}
                    </span>
                  )}
                  <input
                    className="flex-1 min-w-[120px] border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                    value={input.note}
                    onChange={(e) => setInput(h.id, { note: e.target.value })}
                    placeholder="備註（選填）"
                  />
                  <button
                    onClick={() => handleSave(h)}
                    disabled={!validActual || savingId === h.id}
                    className="text-sm text-white bg-primary hover:bg-accent disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {savingId === h.id ? "儲存中..." : "儲存盤點"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">盤點紀錄</h2>
      {counts.length === 0 ? (
        <div className="text-center py-12 text-muted">尚無盤點紀錄</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:flex items-center text-xs text-muted gap-3 px-4 py-2 bg-background">
            <span className="w-24">日期</span>
            <span className="flex-1">五金</span>
            <span className="w-16 text-right">系統</span>
            <span className="w-16 text-right">實際</span>
            <span className="w-16 text-right">差異</span>
            <span className="w-32 text-right">操作</span>
          </div>
          <div className="divide-y divide-border">
            {counts.map((c) => (
              <div key={c.id} className="flex items-center text-sm gap-3 px-4 py-2 flex-wrap sm:flex-nowrap">
                <span className="w-24 text-muted shrink-0">{new Date(c.counted_at).toLocaleDateString("zh-TW")}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{c.hardware?.name ?? "(已刪除)"}</span>
                  {c.note && <span className="text-xs text-muted ml-2">{c.note}</span>}
                </span>
                <span className="w-16 text-right text-muted shrink-0">{c.expected_count}</span>
                <span className="w-16 text-right shrink-0">{c.actual_count}</span>
                <span className={`w-16 text-right font-medium shrink-0 ${c.diff === 0 ? "text-muted" : c.diff > 0 ? "text-green-600" : "text-red-500"}`}>
                  {c.diff > 0 ? "+" : ""}{c.diff}
                </span>
                <span className="w-32 text-right shrink-0 flex gap-2 justify-end">
                  {c.applied ? (
                    <span className="text-xs text-muted">已套用</span>
                  ) : (
                    <button onClick={() => handleApply(c)} className="text-xs text-primary hover:text-accent">套用</button>
                  )}
                  <button onClick={() => handleDeleteCount(c)} className="text-xs text-red-400 hover:text-red-600">刪除</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
