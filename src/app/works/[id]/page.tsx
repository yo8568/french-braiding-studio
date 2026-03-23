"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Work, WorkThread, WorkTechnique } from "@/lib/types";

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [workThreads, setWorkThreads] = useState<WorkThread[]>([]);
  const [workTechniques, setWorkTechniques] = useState<WorkTechnique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [workRes, threadsRes, techniquesRes] = await Promise.all([
        supabase
          .from("works")
          .select("*, creator:creators(*)")
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
      ]);

      setWork(workRes.data as Work | null);
      setWorkThreads((threadsRes.data as WorkThread[]) ?? []);
      setWorkTechniques((techniquesRes.data as WorkTechnique[]) ?? []);
      setLoading(false);
    }

    load();
  }, [params.id]);

  const statusLabels: Record<string, string> = {
    in_progress: "製作中",
    completed: "已完成",
    for_sale: "販售中",
    sold: "已售出",
  };

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;
  if (!work)
    return <div className="text-center py-16 text-muted">找不到作品</div>;

  const totalThreadLength = workThreads.reduce(
    (sum, wt) => sum + wt.length_cm * wt.quantity,
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{work.name}</h1>
          <p className="text-muted mt-1">
            {work.creator?.name ?? "未知編織者"} &middot;{" "}
            {new Date(work.created_at).toLocaleDateString("zh-TW")}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
          {statusLabels[work.status] ?? work.status}
        </span>
      </div>

      {/* Images */}
      {work.image_urls && work.image_urls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {work.image_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${work.name} ${i + 1}`}
              className="w-full h-64 object-cover rounded-xl border border-border"
            />
          ))}
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
          <span className="text-sm text-muted">
            總長: {totalThreadLength.toFixed(1)} cm
          </span>
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
                <span className="text-sm">
                  {wt.length_cm} cm x {wt.quantity}
                </span>
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
    </div>
  );
}
