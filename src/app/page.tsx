"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import type { Work } from "@/lib/types";

export default function Home() {
  const [recentWorks, setRecentWorks] = useState<Work[]>([]);
  const [stats, setStats] = useState({ works: 0, clients: 0, techniques: 0 });

  usePageShow(() => {
    const supabase = createClient();

    async function load() {
      const [worksRes, clientsRes, techniquesRes, recentRes] =
        await Promise.all([
          supabase.from("works").select("*", { count: "exact", head: true }),
          supabase
            .from("clients")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("techniques")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("works")
            .select("*, client:clients(*)")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      setStats({
        works: worksRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        techniques: techniquesRes.count ?? 0,
      });
      setRecentWorks((recentRes.data as Work[]) ?? []);
    }

    load();
  });

  return (
    <div className="space-y-10">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-primary mb-4">
          法式編織工作室
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto">
          記錄每一件作品的美麗細節 — 線材、編法、靈感與故事
        </p>
      </section>

      <section className="grid grid-cols-3 gap-6 text-center">
        {[
          { value: stats.works, label: "件作品" },
          { value: stats.clients, label: "位客戶" },
          { value: stats.techniques, label: "種編法" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-6">
            <div className="text-3xl font-bold text-primary">{value}</div>
            <div className="text-muted mt-1">{label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">最近作品</h2>
        {recentWorks.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p>還沒有作品，</p>
            <a
              href="/works/new"
              className="text-primary hover:underline font-medium"
            >
              新增第一件作品
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentWorks.map((work) => (
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
                  <h3 className="font-semibold">{work.name}</h3>
                  <p className="text-sm text-muted mt-1">
                    {work.client?.name} &middot;{" "}
                    {work.price ? `NT$${work.price}` : "未定價"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
