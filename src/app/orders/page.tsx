"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import {
  INPUT_CLASS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  WORK_STATUS_LABELS,
  WORK_STATUS_COLORS,
  NOTE_TYPE_LABELS,
} from "@/lib/constants";
import { uploadImages } from "@/lib/upload";
import { handleOrderDelivered } from "@/lib/status-automation";
import type { Client, Order, Work, ClientNote } from "@/lib/types";
import Modal from "@/app/components/Modal";
import Lightbox from "@/app/components/Lightbox";
import Pagination, { paginate } from "@/app/components/Pagination";

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [orderNotes, setOrderNotes] = useState<Record<string, ClientNote[]>>({});
  const [noteForm, setNoteForm] = useState<{
    orderId: string;
    clientId: string;
    type: ClientNote["type"];
    content: string;
    images: File[];
  } | null>(null);
  const [page, setPage] = useState(1);

  // New order form
  const [form, setForm] = useState({
    client_id: "",
    client_input: "",
    shipping_method: "",
    notes: "",
  });
  const [workNames, setWorkNames] = useState<string[]>([""]);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [ordersRes, clientsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, client:clients(*), works(*)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ]);
    setOrders((ordersRes.data as Order[]) ?? []);
    setClients((clientsRes.data as Client[]) ?? []);
    setLoading(false);
  }

  function handleClientSelect(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    const latestOrder = orders.find((o) => o.client_id === clientId);
    setForm({
      ...form,
      client_id: clientId,
      client_input: client?.name ?? "",
      shipping_method: latestOrder?.shipping_method ?? client?.shipping_method ?? "",
      notes: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id && !form.client_input.trim()) return;

    const validNames = workNames.filter((n) => n.trim());
    if (validNames.length === 0) {
      alert("請至少輸入一個作品主題");
      return;
    }

    let clientId = form.client_id;

    // Create new client if needed
    if (!clientId && form.client_input.trim()) {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({ name: form.client_input.trim() })
        .select()
        .single();
      if (clientErr || !newClient) {
        alert("建立客戶失敗");
        return;
      }
      clientId = newClient.id;
    }

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_id: clientId,
        shipping_method: form.shipping_method || null,
        status: "preparing",
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error || !order) {
      alert("建立訂單失敗");
      return;
    }

    // Create works for each theme
    await supabase.from("works").insert(
      validNames.map((name) => ({
        name: name.trim(),
        client_id: clientId,
        order_id: order.id,
        status: "ideation",
        image_urls: [],
      }))
    );

    const isNewClient = !form.client_id && form.client_input.trim();
    setShowForm(false);
    setForm({ client_id: "", client_input: "", shipping_method: "", notes: "" });
    setWorkNames([""]);
    loadAll();
    if (isNewClient) {
      alert("已自動新增客戶，請至客戶管理填寫完整資料");
    }
  }

  async function handleStatusChange(orderId: string, newStatus: Order["status"]) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (newStatus === "delivered") {
      await handleOrderDelivered(orderId);
    }
    loadAll();
  }

  async function loadOrderNotes(orderId: string) {
    if (orderNotes[orderId]) {
      const updated = { ...orderNotes };
      delete updated[orderId];
      setOrderNotes(updated);
      return;
    }
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setOrderNotes({ ...orderNotes, [orderId]: (data as ClientNote[]) ?? [] });
  }

  async function handleAddNote() {
    if (!noteForm || !noteForm.content.trim()) return;
    const imageUrls = await uploadImages(noteForm.images, "notes/");
    await supabase.from("client_notes").insert({
      client_id: noteForm.clientId,
      order_id: noteForm.orderId,
      type: noteForm.type,
      content: noteForm.content.trim(),
      image_urls: imageUrls,
    });
    setNoteForm(null);
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("order_id", noteForm.orderId)
      .order("created_at", { ascending: false });
    setOrderNotes({ ...orderNotes, [noteForm.orderId]: (data as ClientNote[]) ?? [] });
  }

  async function handleDeleteNote(noteId: string, orderId: string) {
    await supabase.from("client_notes").delete().eq("id", noteId);
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setOrderNotes({ ...orderNotes, [orderId]: (data as ClientNote[]) ?? [] });
  }

  // Get allowed next statuses
  function getNextStatuses(current: string): Order["status"][] {
    switch (current) {
      case "preparing": return [];
      case "pending": return ["shipped"];
      case "shipped": return ["delivered"];
      default: return [];
    }
  }

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">訂單管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors"
        >
          + 新增訂單
        </button>
      </div>

      {/* New order form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="新增訂單">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium mb-1">客戶 *</label>
            <input
              required
              className={INPUT_CLASS}
              list="client-list"
              value={form.client_input}
              onChange={(e) => {
                const value = e.target.value;
                const match = clients.find((c) => c.name === value);
                if (match) {
                  handleClientSelect(match.id);
                } else {
                  setForm({ ...form, client_input: value, client_id: "" });
                }
              }}
              placeholder="選擇或輸入新客戶名稱"
            />
            <datalist id="client-list">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            {!form.client_id && form.client_input.trim() && (
              <p className="text-xs text-yellow-600 mt-1">
                將自動建立新客戶「{form.client_input.trim()}」
              </p>
            )}
          </div>

          {/* Work themes */}
          <div>
            <label className="block text-sm font-medium mb-1">作品主題 *</label>
            {workNames.map((name, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className={INPUT_CLASS}
                  value={name}
                  onChange={(e) => {
                    const updated = [...workNames];
                    updated[i] = e.target.value;
                    setWorkNames(updated);
                  }}
                  placeholder={`例：飲料提繩、手鏈...`}
                />
                {workNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setWorkNames(workNames.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-sm shrink-0"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setWorkNames([...workNames, ""])}
              className="text-sm text-primary hover:text-accent"
            >
              + 新增作品
            </button>
          </div>

          {/* Shipping & notes */}
          <div>
            <label className="block text-sm font-medium mb-1">運送方式</label>
            <input
              className={INPUT_CLASS}
              value={form.shipping_method}
              onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
              placeholder="例：宅配、超商取貨、面交"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea
              className={INPUT_CLASS}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              建立訂單
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-border px-6 py-2 rounded-lg hover:bg-card transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無訂單</div>
      ) : (() => {
        const { paged, totalPages } = paginate(orders, page);
        return (<>
        <div className="space-y-4">
          {paged.map((order) => {
            const isExpanded = expandedId === order.id;
            const orderWorks = order.works ?? [];
            const completedCount = orderWorks.filter((w) => w.status === "completed" || w.status === "sold").length;
            const notes = orderNotes[order.id];
            const nextStatuses = getNextStatuses(order.status);

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Order header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{order.client?.name ?? "未知客戶"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted mt-1">
                        {new Date(order.created_at).toLocaleDateString("zh-TW")}
                        {order.shipping_method && <> · {order.shipping_method}</>}
                        <span className="ml-2">
                          作品進度：{completedCount}/{orderWorks.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {nextStatuses.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            if (s === "delivered" && !confirm("確定已送達？所有作品將標記為已售出。")) return;
                            handleStatusChange(order.id, s);
                          }}
                          className="text-xs px-3 py-1 rounded-lg bg-primary text-white hover:bg-accent"
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </button>
                      ))}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="text-sm text-primary hover:text-accent"
                      >
                        {isExpanded ? "收合 ▲" : "詳情 ▼"}
                      </button>
                    </div>
                  </div>

                  {/* Work list preview */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {orderWorks.map((w) => (
                      <a
                        key={w.id}
                        href={`/works/${w.id}`}
                        className={`text-xs px-2 py-1 rounded-lg border border-border hover:bg-background transition-colors ${WORK_STATUS_COLORS[w.status]}`}
                      >
                        {w.name}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border bg-background">
                    {/* Works detail */}
                    {orderWorks.length > 0 && (
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium mb-2">作品列表</p>
                        <div className="space-y-2">
                          {orderWorks.map((work) => (
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
                                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${WORK_STATUS_COLORS[work.status]}`}>
                                    {WORK_STATUS_LABELS[work.status]}
                                  </span>
                                </div>
                              </div>
                              {work.price && (
                                <span className="text-sm text-primary font-medium">NT${work.price}</span>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium mb-1">備註</p>
                        <p className="text-sm text-muted whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}

                    {/* Notes / feedback */}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => loadOrderNotes(order.id)}
                          className="text-sm font-medium text-primary hover:text-accent"
                        >
                          {notes ? "隱藏回饋紀錄 ▲" : "查看回饋紀錄 ▼"}
                        </button>
                        <button
                          onClick={() =>
                            setNoteForm(
                              noteForm?.orderId === order.id
                                ? null
                                : { orderId: order.id, clientId: order.client_id, type: "communication", content: "", images: [] }
                            )
                          }
                          className="text-sm text-primary hover:text-accent"
                        >
                          + 新增紀錄
                        </button>
                      </div>

                      {/* Add note form */}
                      {noteForm?.orderId === order.id && (
                        <div className="bg-card border border-border rounded-lg p-3 mb-3 space-y-2">
                          <select
                            className={INPUT_CLASS}
                            value={noteForm.type}
                            onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value as ClientNote["type"] })}
                          >
                            {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <textarea
                            className={INPUT_CLASS}
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
                              onChange={(e) => setNoteForm({ ...noteForm, images: Array.from(e.target.files ?? []) })}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleAddNote} className="bg-primary text-white px-4 py-1 rounded-lg text-sm hover:bg-accent">
                              儲存
                            </button>
                            <button onClick={() => setNoteForm(null)} className="text-muted text-sm">取消</button>
                          </div>
                        </div>
                      )}

                      {/* Notes list */}
                      {notes && (
                        notes.length === 0 ? (
                          <p className="text-sm text-muted">尚無紀錄</p>
                        ) : (
                          <div className="space-y-2">
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                className="flex items-start justify-between px-3 py-2 rounded-lg bg-card border border-border"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                      {NOTE_TYPE_LABELS[note.type] ?? note.type}
                                    </span>
                                    <span className="text-xs text-muted">
                                      {new Date(note.created_at).toLocaleDateString("zh-TW")}{" "}
                                      {new Date(note.created_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                  {note.image_urls?.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      {note.image_urls.map((url, i) => (
                                        <img
                                          key={i}
                                          src={url}
                                          alt={`回饋圖片 ${i + 1}`}
                                          className="w-16 h-16 object-cover rounded border border-border cursor-pointer hover:opacity-80"
                                          onClick={() => setLightbox({ images: note.image_urls, index: i })}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteNote(note.id, order.id)}
                                  className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0"
                                >
                                  刪除
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>);
      })()}

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
