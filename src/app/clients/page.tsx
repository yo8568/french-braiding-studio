"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Client, ClientNote, Work } from "@/lib/types";

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientWorks, setClientWorks] = useState<Record<string, Work[]>>({});
  const [clientNotes, setClientNotes] = useState<Record<string, ClientNote[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<{ clientId: string; type: ClientNote["type"]; content: string; images: File[] } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    shipping_method: "" as "" | "delivery" | "convenience_store",
    shipping_address: "",
    store_name: "",
    store_branch: "",
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
    const clientList = (data as Client[]) ?? [];
    setClients(clientList);

    // Load works for all clients
    if (clientList.length > 0) {
      const ids = clientList.map((c) => c.id);
      const { data: works } = await supabase
        .from("works")
        .select("*")
        .in("client_id", ids)
        .order("created_at", { ascending: false });

      const grouped: Record<string, Work[]> = {};
      for (const w of (works as Work[]) ?? []) {
        if (!grouped[w.client_id]) grouped[w.client_id] = [];
        grouped[w.client_id].push(w);
      }
      setClientWorks(grouped);
    }

    // Load notes for all clients
    if (clientList.length > 0) {
      const ids = clientList.map((c) => c.id);
      const { data: notes } = await supabase
        .from("client_notes")
        .select("*")
        .in("client_id", ids)
        .order("created_at", { ascending: false });

      const groupedNotes: Record<string, ClientNote[]> = {};
      for (const n of (notes as ClientNote[]) ?? []) {
        if (!groupedNotes[n.client_id]) groupedNotes[n.client_id] = [];
        groupedNotes[n.client_id].push(n);
      }
      setClientNotes(groupedNotes);
    }

    setLoading(false);
  }

  async function handleAddNote() {
    if (!noteForm || !noteForm.content.trim()) return;

    // Upload images
    const imageUrls: string[] = [];
    for (const file of noteForm.images) {
      const ext = file.name.split(".").pop();
      const path = `notes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("work-images").upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("work-images").getPublicUrl(path);
        imageUrls.push(publicUrl);
      }
    }

    await supabase.from("client_notes").insert({
      client_id: noteForm.clientId,
      type: noteForm.type,
      content: noteForm.content.trim(),
      image_urls: imageUrls,
    });
    setNoteForm(null);
    loadClients();
  }

  async function handleDeleteNote(noteId: string) {
    await supabase.from("client_notes").delete().eq("id", noteId);
    loadClients();
  }

  function resetForm() {
    setForm({
      name: "",
      phone: "",
      shipping_method: "",
      shipping_address: "",
      store_name: "",
      store_branch: "",
      bio: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(client: Client) {
    setForm({
      name: client.name,
      phone: client.phone ?? "",
      shipping_method: client.shipping_method ?? "",
      shipping_address: client.shipping_address ?? "",
      store_name: client.store_name ?? "",
      store_branch: client.store_branch ?? "",
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
      phone: form.phone || null,
      shipping_method: form.shipping_method || null,
      shipping_address: form.shipping_method === "delivery" ? (form.shipping_address || null) : null,
      store_name: form.shipping_method === "convenience_store" ? (form.store_name || null) : null,
      store_branch: form.shipping_method === "convenience_store" ? (form.store_branch || null) : null,
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

  const shippingLabels: Record<string, string> = {
    delivery: "宅配",
    convenience_store: "超商取貨",
  };

  const noteTypeLabels: Record<string, string> = {
    feedback: "回饋",
    inquiry: "詢問",
    communication: "溝通",
    other: "其他",
  };

  const statusLabels: Record<string, string> = {
    in_progress: "製作中",
    completed: "已完成",
    for_sale: "販售中",
    sold: "已售出",
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">電話</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0912-345-678"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">運送方式</label>
              <select
                className={inputClass}
                value={form.shipping_method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shipping_method: e.target.value as "" | "delivery" | "convenience_store",
                  })
                }
              >
                <option value="">未設定</option>
                <option value="delivery">宅配</option>
                <option value="convenience_store">超商取貨</option>
              </select>
            </div>

            {form.shipping_method === "delivery" && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">宅配地址</label>
                <input
                  className={inputClass}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  placeholder="台北市信義區..."
                />
              </div>
            )}

            {form.shipping_method === "convenience_store" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">超商名稱</label>
                  <select
                    className={inputClass}
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  >
                    <option value="">選擇超商</option>
                    <option value="7-ELEVEN">7-ELEVEN</option>
                    <option value="全家">全家</option>
                    <option value="萊爾富">萊爾富</option>
                    <option value="OK超商">OK超商</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">門市名稱</label>
                  <input
                    className={inputClass}
                    value={form.store_branch}
                    onChange={(e) => setForm({ ...form, store_branch: e.target.value })}
                    placeholder="例：信義門市"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
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
        <div className="space-y-4">
          {clients.map((client) => {
            const works = clientWorks[client.id] ?? [];
            const isExpanded = expandedId === client.id;

            return (
              <div
                key={client.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Client info row */}
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{client.name}</span>
                      {client.phone && (
                        <span className="text-sm text-muted">{client.phone}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                      {client.shipping_method && (
                        <span>
                          {shippingLabels[client.shipping_method] ?? client.shipping_method}
                          {client.shipping_method === "delivery" && client.shipping_address && (
                            <> — {client.shipping_address}</>
                          )}
                          {client.shipping_method === "convenience_store" && (
                            <>
                              {client.store_name && <> — {client.store_name}</>}
                              {client.store_branch && <> {client.store_branch}</>}
                            </>
                          )}
                        </span>
                      )}
                      {client.bio && <span>{client.bio}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : client.id)}
                      className="text-sm text-primary hover:text-accent"
                    >
                      詳情 {isExpanded ? "▲" : "▼"}
                    </button>
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-primary hover:text-accent text-sm"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      刪除
                    </button>
                  </div>
                </div>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="border-t border-border bg-background">
                    {/* Purchase history */}
                    {works.length > 0 && (
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium mb-2">消費紀錄 ({works.length})</p>
                        <div className="space-y-2">
                          {works.map((work) => (
                            <a
                              key={work.id}
                              href={`/works/${work.id}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-card transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {work.image_urls?.[0] ? (
                                  <img
                                    src={work.image_urls[0]}
                                    alt={work.name}
                                    className="w-10 h-10 rounded object-cover border border-border"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-border flex items-center justify-center text-xs text-muted">
                                    無圖
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-sm">{work.name}</span>
                                  <span className="text-xs text-muted ml-2">
                                    {statusLabels[work.status] ?? work.status}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                {work.price ? (
                                  <span className="text-primary font-medium">NT${work.price}</span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                                <p className="text-xs text-muted">
                                  {new Date(work.created_at).toLocaleDateString("zh-TW")}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes / interaction history */}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">往來紀錄</p>
                        <button
                          onClick={() =>
                            setNoteForm(
                              noteForm?.clientId === client.id
                                ? null
                                : { clientId: client.id, type: "communication", content: "", images: [] }
                            )
                          }
                          className="text-sm text-primary hover:text-accent"
                        >
                          + 新增紀錄
                        </button>
                      </div>

                      {/* Add note form */}
                      {noteForm?.clientId === client.id && (
                        <div className="bg-card border border-border rounded-lg p-3 mb-3 space-y-2">
                          <select
                            className={inputClass}
                            value={noteForm.type}
                            onChange={(e) =>
                              setNoteForm({ ...noteForm, type: e.target.value as ClientNote["type"] })
                            }
                          >
                            <option value="feedback">回饋</option>
                            <option value="inquiry">詢問</option>
                            <option value="communication">溝通</option>
                            <option value="other">其他</option>
                          </select>
                          <textarea
                            className={inputClass}
                            rows={2}
                            value={noteForm.content}
                            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                            placeholder="記錄內容..."
                          />
                          <div>
                            <label className="block text-xs text-muted mb-1">附加圖片</label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) =>
                                setNoteForm({ ...noteForm, images: Array.from(e.target.files ?? []) })
                              }
                              className={inputClass}
                            />
                            {noteForm.images.length > 0 && (
                              <p className="text-xs text-muted mt-1">已選擇 {noteForm.images.length} 張圖片</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddNote}
                              className="bg-primary text-white px-4 py-1 rounded-lg text-sm hover:bg-accent"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => setNoteForm(null)}
                              className="text-muted text-sm"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Notes list */}
                      {(clientNotes[client.id] ?? []).length === 0 ? (
                        <p className="text-sm text-muted">尚無紀錄</p>
                      ) : (
                        <div className="space-y-2">
                          {(clientNotes[client.id] ?? []).map((note) => (
                            <div
                              key={note.id}
                              className="flex items-start justify-between px-3 py-2 rounded-lg bg-card border border-border"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {noteTypeLabels[note.type] ?? note.type}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {new Date(note.created_at).toLocaleDateString("zh-TW")}{" "}
                                    {new Date(note.created_at).toLocaleTimeString("zh-TW", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                {note.image_urls?.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {note.image_urls.map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt={`紀錄圖片 ${i + 1}`}
                                        className="w-20 h-20 object-cover rounded border border-border cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(url, "_blank")}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0"
                              >
                                刪除
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
