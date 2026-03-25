"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { restoreThreadStock, restoreHardwareStock } from "@/lib/work-helpers";
import { transitionWorkStatus } from "@/lib/status-automation";
import { WORK_STATUS_LABELS, WORK_STATUS_COLORS } from "@/lib/constants";
import type { Work, WorkThread, WorkTechnique, WorkHardware } from "@/lib/types";
import Lightbox from "@/app/components/Lightbox";

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [work, setWork] = useState<Work | null>(null);
  const [workThreads, setWorkThreads] = useState<WorkThread[]>([]);
  const [workTechniques, setWorkTechniques] = useState<WorkTechnique[]>([]);
  const [workHardware, setWorkHardware] = useState<WorkHardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadCostPerCm, setThreadCostPerCm] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  async function handleDelete() {
    if (!confirm("確定要刪除這個作品嗎？")) return;
    const supabase = createClient();
    if (work && (work.status === "in_progress" || work.status === "completed")) {
      const restoreStock = confirm("是否將用量加回庫存（線材＋五金）？");
      if (restoreStock) {
        await restoreThreadStock(params.id);
        await restoreHardwareStock(params.id);
      }
    }
    await supabase.from("works").delete().eq("id", params.id);
    router.push("/works");
  }

  async function handleStatusTransition(newStatus: string) {
    if (!work) return;
    if (newStatus === "in_progress" && !confirm("開始製作後將扣除線材庫存，且無法退回發想中。確定？")) return;
    const ok = await transitionWorkStatus(params.id, work.status, newStatus);
    if (ok) {
      // Reload page data
      window.location.reload();
    } else {
      alert("狀態轉換失敗");
    }
  }

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [workRes, threadsRes, techniquesRes, hardwareRes] = await Promise.all([
        supabase
          .from("works")
          .select("*, client:clients(*)")
          .eq("id", params.id)
          .single(),
        supabase
          .from("work_threads")
          .select("*, thread:threads(*)")
          .eq("work_id", params.id),
        supabase
          .from("work_techniques")
          .select("*, technique:techniques(*)")
          .eq("work_id", params.id),
        supabase
          .from("work_hardware")
          .select("*, hardware:hardware(*)")
          .eq("work_id", params.id),
      ]);

      const wt = (threadsRes.data as WorkThread[]) ?? [];
      setWork(workRes.data as Work | null);
      setWorkThreads(wt);
      setWorkTechniques((techniquesRes.data as WorkTechnique[]) ?? []);
      setWorkHardware((hardwareRes.data as WorkHardware[]) ?? []);

      // Load purchase history for cost calculation
      const threadIds = [...new Set(wt.map((t) => t.thread_id))];
      if (threadIds.length > 0) {
        const { data: purchases } = await supabase
          .from("thread_purchases")
          .select("thread_id, length_cm, price")
          .in("thread_id", threadIds);
        if (purchases) {
          const costMap: Record<string, number> = {};
          const grouped: Record<string, { thread_id: string; length_cm: number; price: number }[]> = {};
          for (const p of purchases) {
            (grouped[p.thread_id] ??= []).push(p);
          }
          for (const [tid, items] of Object.entries(grouped)) {
            const totalSpent = items.reduce((s, i) => s + i.price, 0);
            const totalLen = items.reduce((s, i) => s + i.length_cm, 0);
            costMap[tid] = totalLen > 0 ? totalSpent / totalLen : 0;
          }
          setThreadCostPerCm(costMap);
        }
      }

      setLoading(false);
    }

    load();
  }, [params.id]);

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;
  if (!work)
    return <div className="text-center py-16 text-muted">找不到作品</div>;

  const totalThreadLength = workThreads.reduce(
    (sum, wt) => sum + wt.length_cm * wt.quantity,
    0
  );
  const totalThreadCost = workThreads.reduce(
    (sum, wt) => sum + wt.length_cm * wt.quantity * (threadCostPerCm[wt.thread_id] ?? 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{work.name}</h1>
          <p className="text-muted mt-1">
            {work.client?.name ?? "未知客戶"} &middot;{" "}
            {new Date(work.created_at).toLocaleDateString("zh-TW")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-sm ${WORK_STATUS_COLORS[work.status]}`}>
            {WORK_STATUS_LABELS[work.status] ?? work.status}
          </span>
          {work.status === "ideation" && (
            <button
              onClick={() => handleStatusTransition("in_progress")}
              className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-sm hover:bg-yellow-600"
            >
              開始製作
            </button>
          )}
          {work.status === "in_progress" && (
            <button
              onClick={() => handleStatusTransition("completed")}
              className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
            >
              標記完成
            </button>
          )}
          <Link
            href={`/works/${params.id}/edit`}
            className="px-4 py-1 rounded-lg bg-primary text-white text-sm hover:bg-accent transition-colors"
          >
            編輯
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-1 rounded-lg text-red-500 text-sm hover:bg-red-50 transition-colors"
          >
            刪除
          </button>
        </div>
      </div>

      {/* Images */}
      {work.image_urls && work.image_urls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {work.image_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${work.name} ${i + 1}`}
              className="w-full h-64 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLightbox({ images: work.image_urls, index: i })}
            />
          ))}
        </div>
      )}

      {/* Memo */}
      {work.memo && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-primary mb-2">發想筆記</h2>
          <p className="whitespace-pre-wrap">{work.memo}</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">作品資訊</h2>

          {work.description && (
            <div>
              <span className="text-sm text-muted">說明</span>
              <p>{work.description}</p>
            </div>
          )}

          {work.price && (
            <div>
              <span className="text-sm text-muted">價格</span>
              <p className="text-xl font-bold text-primary">NT${work.price}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted">花朵數量</span>
              <p className="font-semibold">{work.flower_count ?? 0}</p>
            </div>
            <div>
              <span className="text-sm text-muted">變化數量</span>
              <p className="font-semibold">{work.variation_count ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">故事與靈感</h2>

          {work.inspiration && (
            <div>
              <span className="text-sm text-muted">靈感來源</span>
              <p>{work.inspiration}</p>
            </div>
          )}

          {work.meaning && (
            <div>
              <span className="text-sm text-muted">寓意</span>
              <p>{work.meaning}</p>
            </div>
          )}

          {work.special_notes && (
            <div>
              <span className="text-sm text-muted">特別之處</span>
              <p>{work.special_notes}</p>
            </div>
          )}

          {!work.inspiration && !work.meaning && !work.special_notes && (
            <p className="text-muted">尚未記錄</p>
          )}
        </div>
      </div>

      {/* Threads */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">使用線材</h2>
          <div className="text-right">
            <span className="text-sm text-muted">
              總長: {totalThreadLength.toFixed(1)} cm
            </span>
            {totalThreadCost > 0 && (
              <p className="text-sm font-medium text-primary">
                線材成本: NT${totalThreadCost.toFixed(0)}
              </p>
            )}
          </div>
        </div>

        {workThreads.length === 0 ? (
          <p className="text-muted">尚未記錄線材</p>
        ) : (
          <div className="space-y-3">
            {workThreads.map((wt) => (
              <div
                key={wt.id}
                className="flex items-center gap-3 border-b border-border pb-3 last:border-0"
              >
                <div
                  className="w-6 h-6 rounded-full border border-border shrink-0"
                  style={{
                    backgroundColor: wt.thread?.color_hex ?? "#ccc",
                  }}
                />
                <div className="flex-1">
                  <span className="font-medium">
                    {wt.thread?.color_name ?? "未知"}
                  </span>
                  {wt.thread?.material && (
                    <span className="text-sm text-muted ml-2">
                      {wt.thread.material}
                    </span>
                  )}
                </div>
                <div className="text-right text-sm">
                  <span>{wt.length_cm} cm x {wt.quantity}</span>
                  {threadCostPerCm[wt.thread_id] > 0 && (
                    <p className="text-xs text-muted">
                      NT${(wt.length_cm * wt.quantity * threadCostPerCm[wt.thread_id]).toFixed(0)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hardware */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">使用五金</h2>
        {workHardware.length === 0 ? (
          <p className="text-muted">尚未記錄五金</p>
        ) : (
          <div className="space-y-3">
            {workHardware.map((wh) => (
              <div
                key={wh.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div>
                  <span className="font-medium">{wh.hardware?.name ?? "未知"}</span>
                  {wh.notes && <span className="text-sm text-muted ml-2">{wh.notes}</span>}
                </div>
                <div className="text-sm text-right">
                  <span>x {wh.quantity}</span>
                  {wh.hardware?.price && (
                    <p className="text-xs text-muted">NT${(wh.hardware.price * wh.quantity).toFixed(0)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Techniques */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">使用編法</h2>

        {workTechniques.length === 0 ? (
          <p className="text-muted">尚未記錄編法</p>
        ) : (
          <div className="space-y-3">
            {workTechniques.map((wt) => (
              <div
                key={wt.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div>
                  <span className="font-medium">
                    {wt.technique?.name ?? "未知"}
                  </span>
                  {wt.notes && (
                    <span className="text-sm text-muted ml-2">{wt.notes}</span>
                  )}
                </div>
                <span className="text-sm text-muted">
                  使用 {wt.usage_count} 次
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
