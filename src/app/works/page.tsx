"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { WORK_STATUS_LABELS } from "@/lib/constants";
import type { Work } from "@/lib/types";

const filterLabels: Record<string, string> = { all: "全部", ...WORK_STATUS_LABELS };

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      let query = supabase
        .from("works")
        .select("*, client:clients(*)")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setWorks((data as Work[]) ?? []);
    }

    load();
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">作品集</h1>
        <a
          href="/works/new"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增作品
        </a>
      </div>

      <div className="flex gap-2 mb-6">
        {Object.entries(filterLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === key
                ? "bg-primary text-white"
                : "bg-card border border-border hover:bg-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {works.length === 0 ? (
        <div className="text-center py-16 text-muted">暫無作品</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((work) => (
            <a
              key={work.id}
              href={`/works/${work.id}`}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {work.image_urls?.[0] ? (
                <img
                  src={work.image_urls[0]}
                  alt={work.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-border flex items-center justify-center text-muted">
                  無圖片
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{work.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {WORK_STATUS_LABELS[work.status] ?? work.status}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  {work.client?.name}
                </p>
                {work.price && (
                  <p className="text-primary font-medium mt-2">
                    NT${work.price}
                  </p>
                )}
                {work.flower_count ? (
                  <p className="text-xs text-muted mt-1">
                    {work.flower_count} 朵花 &middot; {work.variation_count ?? 0}{" "}
                    種變化
                  </p>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
