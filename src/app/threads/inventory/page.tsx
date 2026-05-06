"use client";

import { useMemo, useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Thread, ThreadPurchase, ThreadInventoryCount } from "@/lib/types";

type InputState = { actual: string; note: string };

export default function ThreadInventoryPage() {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [purchases, setPurchases] = useState<Record<string, ThreadPurchase[]>>({});
  const [counts, setCounts] = useState<ThreadInventoryCount[]>([]);
  const [inputs, setInputs] = useState<Record<string, InputState>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [tRes, purchasesRes, countsRes] = await Promise.all([
      supabase.from("threads").select("*").order("color_name"),
      supabase.from("thread_purchases").select("*"),
      supabase
        .from("thread_inventory_counts")
        .select("*, thread:threads(*)")
        .order("counted_at", { ascending: false })
        .limit(50),
    ]);
    setThreads((tRes.data as Thread[]) ?? []);
    const grouped: Record<string, ThreadPurchase[]> = {};
    for (const p of (purchasesRes.data as ThreadPurchase[]) ?? []) {
      (grouped[p.thread_id] ??= []).push(p);
    }
    setPurchases(grouped);
    setCounts((countsRes.data as ThreadInventoryCount[]) ?? []);
    setLoading(false);
  }

  function expectedOf(threadId: string): number {
    const ps = purchases[threadId] ?? [];
    return ps.reduce((s, p) => s + p.length_cm, 0);
  }

  function getInput(threadId: string): InputState {
    return inputs[threadId] ?? { actual: "", note: "" };
  }

  function setInput(threadId: string, patch: Partial<InputState>) {
    setInputs((prev) => ({ ...prev, [threadId]: { ...getInput(threadId), ...patch } }));
  }

  async function handleSave(t: Thread) {
    const { actual, note } = getInput(t.id);
    const actualNum = parseFloat(actual);
    if (isNaN(actualNum) || actualNum < 0) return;
    const expected = expectedOf(t.id);
    setSavingId(t.id);
    const { error } = await supabase.from("thread_inventory_counts").insert({
      thread_id: t.id,
      expected_length_cm: expected,
      actual_length_cm: actualNum,
      note: note.trim() || null,
    });
    setSavingId(null);
    if (error) {
      alert("儲存失敗: " + error.message);
      return;
    }
    setInputs((prev) => ({ ...prev, [t.id]: { actual: "", note: "" } }));
    loadAll();
  }

  async function handleApply(c: ThreadInventoryCount) {
    if (c.applied) return;
    if (!confirm(`套用後會新增一筆盤點調整（${c.diff_cm > 0 ? "+" : ""}${c.diff_cm} cm）以同步系統庫存，確定？`)) return;
    if (Number(c.diff_cm) !== 0) {
      const { error: pErr } = await supabase.from("thread_purchases").insert({
        thread_id: c.thread_id,
        length_cm: c.diff_cm,
        price: 0,
        note: `盤點調整（實際 ${c.actual_length_cm} cm / 系統 ${c.expected_length_cm} cm）`,
      });
      if (pErr) {
        alert("套用失敗: " + pErr.message);
        return;
      }
    }
    const { error } = await supabase
      .from("thread_inventory_counts")
      .update({ applied: true })
      .eq("id", c.id);
    if (error) {
      alert("狀態更新失敗: " + error.message);
      return;
    }
    loadAll();
  }

  async function handleDeleteCount(c: ThreadInventoryCount) {
    if (c.applied) {
      if (!confirm("此筆已套用，刪除僅移除紀錄、不會還原調整，確定？")) return;
    } else {
      if (!confirm("確定刪除這筆盤點紀錄？")) return;
    }
    await supabase.from("thread_inventory_counts").delete().eq("id", c.id);
    loadAll();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.trim().toLowerCase();
    return threads.filter(
      (t) =>
        t.color_name.toLowerCase().includes(q) ||
        (t.material?.toLowerCase().includes(q)) ||
        (t.source?.toLowerCase().includes(q))
    );
  }, [threads, search]);

  if (loading) return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">線材盤點</h1>
        <a href="/threads" className="text-sm text-muted hover:text-primary">← 返回線材管理</a>
      </div>

      <div className="mb-6">
        <input
          className={INPUT_CLASS}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋顏色、材質、來源..."
        />
      </div>

      <h2 className="text-lg font-semibold mb-3">本次盤點</h2>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">{search ? "無符合結果" : "尚無線材"}</div>
      ) : (
        <div className="space-y-3 mb-10">
          {filtered.map((t) => {
            const expected = expectedOf(t.id);
            const input = getInput(t.id);
            const actualNum = parseFloat(input.actual);
            const validActual = !isNaN(actualNum) && actualNum >= 0;
            const diff = validActual ? actualNum - expected : 0;
            return (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="w-8 h-8 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: t.color_hex }}
                    title={t.color_hex}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{t.color_name}</span>
                      {t.material && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.material}</span>
                      )}
                      {t.thickness_mm && <span className="text-xs text-muted">{t.thickness_mm} mm</span>}
                    </div>
                  </div>
                  <span className="text-sm text-muted shrink-0">系統庫存：<span className="font-medium text-foreground">{expected} cm</span></span>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  <label className="text-sm text-muted">實際清點</label>
                  <input
                    type="number" step="0.1" min="0"
                    className="w-28 border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                    value={input.actual}
                    onChange={(e) => setInput(t.id, { actual: e.target.value })}
                    placeholder="cm"
                  />
                  {validActual && (
                    <span className={`text-sm font-medium ${diff === 0 ? "text-muted" : diff > 0 ? "text-green-600" : "text-red-500"}`}>
                      差異 {diff > 0 ? "+" : ""}{diff.toFixed(1)} cm
                    </span>
                  )}
                  <input
                    className="flex-1 min-w-[120px] border border-border rounded-lg px-3 py-1.5 text-sm bg-card"
                    value={input.note}
                    onChange={(e) => setInput(t.id, { note: e.target.value })}
                    placeholder="備註（選填）"
                  />
                  <button
                    onClick={() => handleSave(t)}
                    disabled={!validActual || savingId === t.id}
                    className="text-sm text-white bg-primary hover:bg-accent disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {savingId === t.id ? "儲存中..." : "儲存盤點"}
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
            <span className="flex-1">線材</span>
            <span className="w-20 text-right">系統</span>
            <span className="w-20 text-right">實際</span>
            <span className="w-20 text-right">差異</span>
            <span className="w-32 text-right">操作</span>
          </div>
          <div className="divide-y divide-border">
            {counts.map((c) => (
              <div key={c.id} className="flex items-center text-sm gap-3 px-4 py-2 flex-wrap sm:flex-nowrap">
                <span className="w-24 text-muted shrink-0">{new Date(c.counted_at).toLocaleDateString("zh-TW")}</span>
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  {c.thread && (
                    <span
                      className="w-4 h-4 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: c.thread.color_hex }}
                    />
                  )}
                  <span className="font-medium">{c.thread?.color_name ?? "(已刪除)"}</span>
                  {c.note && <span className="text-xs text-muted">{c.note}</span>}
                </span>
                <span className="w-20 text-right text-muted shrink-0">{Number(c.expected_length_cm).toFixed(1)}</span>
                <span className="w-20 text-right shrink-0">{Number(c.actual_length_cm).toFixed(1)}</span>
                <span className={`w-20 text-right font-medium shrink-0 ${Number(c.diff_cm) === 0 ? "text-muted" : Number(c.diff_cm) > 0 ? "text-green-600" : "text-red-500"}`}>
                  {Number(c.diff_cm) > 0 ? "+" : ""}{Number(c.diff_cm).toFixed(1)}
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
