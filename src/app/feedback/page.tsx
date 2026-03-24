"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Feedback } from "@/lib/types";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
} from "@/lib/constants";

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const supabase = createClient();

  const fetchFeedback = async () => {
    setLoading(true);
    let query = supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data } = await query;
    setFeedbackList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, [filterStatus, filterCategory]);

  const toggleResolved = async (item: Feedback) => {
    const newStatus = item.status === "open" ? "resolved" : "open";
    await supabase
      .from("feedback")
      .update({
        status: newStatus,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    fetchFeedback();
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("確定要刪除這筆回饋？")) return;
    await supabase.from("feedback").delete().eq("id", id);
    fetchFeedback();
  };

  const openCount = feedbackList.filter((f) => f.status === "open").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">意見回饋管理</h1>
        <span className="text-sm text-muted">
          共 {feedbackList.length} 筆
          {filterStatus === "all" && ` (${openCount} 筆待處理)`}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "open" | "resolved")}
          className="border border-border rounded-lg px-3 py-2 bg-card text-sm"
        >
          <option value="all">全部狀態</option>
          <option value="open">待處理</option>
          <option value="resolved">已解決</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 bg-card text-sm"
        >
          <option value="all">全部分類</option>
          {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted text-center py-12">載入中...</p>
      ) : feedbackList.length === 0 ? (
        <p className="text-muted text-center py-12">目前沒有回饋資料</p>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((item) => (
            <div
              key={item.id}
              className={`border border-border rounded-xl p-4 bg-card transition-opacity ${
                item.status === "resolved" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        FEEDBACK_STATUS_COLORS[item.status]
                      }`}
                    >
                      {FEEDBACK_STATUS_LABELS[item.status]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {FEEDBACK_CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="text-xs text-muted">
                      {item.page}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                  <p className="text-xs text-muted mt-2">
                    {new Date(item.created_at).toLocaleString("zh-TW")}
                    {item.resolved_at && (
                      <> · 解決於 {new Date(item.resolved_at).toLocaleString("zh-TW")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleResolved(item)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      item.status === "open"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-yellow-500 text-white hover:bg-yellow-600"
                    }`}
                  >
                    {item.status === "open" ? "標記已解決" : "重新開啟"}
                  </button>
                  <button
                    onClick={() => deleteFeedback(item.id)}
                    className="text-xs px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
