"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import {
  INPUT_CLASS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  NOTE_TYPE_LABELS,
} from "@/lib/constants";
import { uploadImages } from "@/lib/upload";
import type { Client, Order, OrderItem, Work, ClientNote } from "@/lib/types";
import Modal from "@/app/components/Modal";
import Lightbox from "@/app/components/Lightbox";

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
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

  const [form, setForm] = useState({
    client_id: "",
    client_input: "",
    shipping_method: "",
    notes: "",
    status: "pending" as Order["status"],
  });
  const [newClientCreated, setNewClientCreated] = useState(false);
  const [orderItems, setOrderItems] = useState<{ work_id: string; price: string; quantity: string }[]>([
    { work_id: "", price: "", quantity: "1" },
  ]);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [ordersRes, clientsRes, worksRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, client:clients(*), order_items(*, work:works(*))")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
      supabase.from("works").select("*").order("name"),
    ]);
    setOrders((ordersRes.data as Order[]) ?? []);
    setClients((clientsRes.data as Client[]) ?? []);
    setWorks((worksRes.data as Work[]) ?? []);
    setLoading(false);
  }

  // Auto-fill from client's latest order, fallback to client info
  function handleClientSelect(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    const latestOrder = orders.find((o) => o.client_id === clientId);
    setForm({
      ...form,
      client_id: clientId,
      client_input: client?.name ?? "",
      shipping_method: latestOrder?.shipping_method ?? client?.shipping_method ?? "",
      notes: latestOrder?.notes ?? "",
    });
    if (latestOrder?.order_items?.length) {
      setOrderItems(
        latestOrder.order_items.map((item) => ({
          work_id: item.work_id,
          price: item.price.toString(),
          quantity: item.quantity.toString(),
        }))
      );
    }
    setNewClientCreated(false);
  }

  // Auto-fill price from work
  function handleWorkChange(index: number, workId: string) {
    const work = works.find((w) => w.id === workId);
    const updated = [...orderItems];
    updated[index].work_id = workId;
    if (work?.price) updated[index].price = work.price.toString();
    setOrderItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id && !form.client_input.trim()) return;

    let clientId = form.client_id;

    // If no existing client selected, create a new one
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
      setNewClientCreated(true);
    }

    const items = orderItems.filter((i) => i.work_id);
    const totalAmount = items.reduce(
      (sum, i) => sum + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1),
      0
    );

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_id: clientId,
        shipping_method: form.shipping_method || null,
        total_amount: totalAmount || null,
        status: form.status,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error || !order) {
      alert("建立訂單失敗");
      return;
    }

    if (items.length > 0) {
      await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          work_id: i.work_id,
          price: parseFloat(i.price) || 0,
          quantity: parseInt(i.quantity) || 1,
        }))
      );
    }

    const isNew = newClientCreated || (!form.client_id && form.client_input.trim());
    setShowForm(false);
    setForm({
      client_id: "",
      client_input: "",
      shipping_method: "",
      notes: "",
      status: "pending",
    });
    setNewClientCreated(false);
    setOrderItems([{ work_id: "", price: "", quantity: "1" }]);
    loadAll();
    if (isNew) {
      alert("已自動新增客戶，請至客戶管理填寫完整資料（社群帳號、運送方式等）");
    }
  }

  async function handleStatusChange(orderId: string, status: Order["status"]) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
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
    // Reload notes for this order
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
                  <option key={c.id} value={c.name}>
                    {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </datalist>
              {!form.client_id && form.client_input.trim() && (
                <p className="text-xs text-yellow-600 mt-1">
                  將自動建立新客戶「{form.client_input.trim()}」
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">運送方式</label>
              <input
                className={INPUT_CLASS}
                value={form.shipping_method}
                onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
                placeholder="例：宅配、超商取貨、面交"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">狀態</label>
              <select
                className={INPUT_CLASS}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Order["status"] })}
              >
                <option value="pending">待出貨</option>
                <option value="shipped">已寄送</option>
                <option value="delivered">已送達</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">備註</label>
              <input
                className={INPUT_CLASS}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Order items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">訂購品項</label>
              <button
                type="button"
                onClick={() => setOrderItems([...orderItems, { work_id: "", price: "", quantity: "1" }])}
                className="text-primary text-sm"
              >
                + 新增品項
              </button>
            </div>
            {orderItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select
                  className={INPUT_CLASS}
                  value={item.work_id}
                  onChange={(e) => handleWorkChange(i, e.target.value)}
                >
                  <option value="">選擇作品</option>
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.price ? `(NT$${w.price})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="w-28 border border-border rounded-lg px-2 py-2 bg-card"
                  placeholder="價格"
                  value={item.price}
                  onChange={(e) => {
                    const updated = [...orderItems];
                    updated[i].price = e.target.value;
                    setOrderItems(updated);
                  }}
                />
                <input
                  type="number"
                  className="w-16 border border-border rounded-lg px-2 py-2 bg-card"
                  placeholder="數量"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...orderItems];
                    updated[i].quantity = e.target.value;
                    setOrderItems(updated);
                  }}
                />
                {orderItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <p className="text-sm text-muted mt-1">
              合計: NT$
              {orderItems
                .reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0)
                .toLocaleString()}
            </p>
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
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const notes = orderNotes[order.id];

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Order header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{order.client?.name ?? "未知客戶"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs border border-border rounded px-2 py-1 bg-card"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order["status"])}
                      >
                        <option value="pending">待出貨</option>
                        <option value="shipped">已寄送</option>
                        <option value="delivered">已送達</option>
                        <option value="cancelled">已取消</option>
                      </select>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="text-sm text-primary hover:text-accent"
                      >
                        {isExpanded ? "收合 ▲" : "詳情 ▼"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>{new Date(order.created_at).toLocaleDateString("zh-TW")}</span>
                    {order.total_amount && (
                      <span className="text-primary font-medium">NT${order.total_amount.toLocaleString()}</span>
                    )}
                    {order.shipping_method && (
                      <span>{order.shipping_method}</span>
                    )}
                    {order.notes && <span>{order.notes}</span>}
                  </div>

                  {/* Inline items preview */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {order.order_items.map((item) => (
                        <a
                          key={item.id}
                          href={`/works/${item.work_id}`}
                          className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-border transition-colors"
                        >
                          {item.work?.name ?? "作品"} x{item.quantity}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-background">
                    {/* Items detail */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium mb-2">品項明細</p>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <a
                              key={item.id}
                              href={`/works/${item.work_id}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-card transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {item.work?.image_urls?.[0] ? (
                                  <img
                                    src={item.work.image_urls[0]}
                                    alt={item.work.name}
                                    className="w-10 h-10 rounded object-cover border border-border"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-border flex items-center justify-center text-xs text-muted">
                                    無圖
                                  </div>
                                )}
                                <span className="font-medium text-sm">{item.work?.name ?? "作品"}</span>
                              </div>
                              <span className="text-sm">
                                NT${item.price.toLocaleString()} x {item.quantity}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order feedback */}
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
                                : {
                                    orderId: order.id,
                                    clientId: order.client_id ?? "",
                                    type: "feedback",
                                    content: "",
                                    images: [],
                                  }
                            )
                          }
                          className="text-sm text-primary hover:text-accent"
                        >
                          + 新增回饋
                        </button>
                      </div>

                      {/* Add note form */}
                      {noteForm?.orderId === order.id && (
                        <div className="bg-card border border-border rounded-lg p-3 mb-3 space-y-2">
                          <select
                            className={INPUT_CLASS}
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
                              onChange={(e) =>
                                setNoteForm({ ...noteForm, images: Array.from(e.target.files ?? []) })
                              }
                              className={INPUT_CLASS}
                            />
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

                      {notes && (
                        <div className="space-y-2">
                          {notes.length === 0 ? (
                            <p className="text-sm text-muted">此訂單尚無回饋紀錄</p>
                          ) : (
                            notes.map((note) => (
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
                            ))
                          )}
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
