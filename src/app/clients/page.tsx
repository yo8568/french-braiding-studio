"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
  });

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    setClients((data as Client[]) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", bio: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(client: Client) {
    setForm({
      name: client.name,
      bio: client.bio ?? "",
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      bio: form.bio || null,
    };

    if (editingId) {
      await supabase.from("clients").update(payload).eq("id", editingId);
    } else {
      await supabase.from("clients").insert(payload);
    }

    resetForm();
    loadClients();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這位客戶嗎？相關作品的客戶欄位會被清除。")) return;
    await supabase.from("clients").delete().eq("id", id);
    loadClients();
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">客戶管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增客戶
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4"
        >
          <h2 className="text-xl font-semibold text-primary">
            {editingId ? "編輯客戶" : "新增客戶"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">姓名 *</label>
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="客戶姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">備註</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="例：朋友介紹、喜歡紅色系、常訂購手鏈"
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
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無客戶</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-sm font-medium">姓名</th>
                <th className="text-left px-4 py-3 text-sm font-medium">備註</th>
                <th className="text-left px-4 py-3 text-sm font-medium">建立日期</th>
                <th className="text-right px-4 py-3 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 hover:bg-background/50"
                >
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-muted">{client.bio ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-sm">
                    {new Date(client.created_at).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-primary hover:text-accent text-sm mr-3"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
