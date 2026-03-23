"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Client, Order, OrderItem, Work, ClientNote } from "@/lib/types";

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, ClientNote[]>>({});

  const [form, setForm] = useState({
    client_id: "",
    shipping_method: "" as "" | "delivery" | "convenience_store",
    shipping_address: "",
    store_name: "",
    store_branch: "",
    notes: "",
    status: "pending" as Order["status"],
  });
  const [orderItems, setOrderItems] = useState<{ work_id: string; price: string; quantity: string }[]>([
    { work_id: "", price: "", quantity: "1" },
  ]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Auto-fill shipping from client
  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    setForm({
      ...form,
      client_id: clientId,
      shipping_method: client?.shipping_method ?? "",
      shipping_address: client?.shipping_address ?? "",
      store_name: client?.store_name ?? "",
      store_branch: client?.store_branch ?? "",
    });
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
    if (!form.client_id) return;

    const items = orderItems.filter((i) => i.work_id);
    const totalAmount = items.reduce(
      (sum, i) => sum + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1),
      0
    );

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_id: form.client_id,
        shipping_method: form.shipping_method || null,
        shipping_address: form.shipping_method === "delivery" ? (form.shipping_address || null) : null,
        store_name: form.shipping_method === "convenience_store" ? (form.store_name || null) : null,
        store_branch: form.shipping_method === "convenience_store" ? (form.store_branch || null) : null,
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

    setShowForm(false);
    setForm({
      client_id: "",
      shipping_method: "",
      shipping_address: "",
      store_name: "",
      store_branch: "",
      notes: "",
      status: "pending",
    });
    setOrderItems([{ work_id: "", price: "", quantity: "1" }]);
    loadAll();
  }

  async function handleStatusChange(orderId: string, status: Order["status"]) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    loadAll();
  }

  async function toggleNotes(clientId: string) {
    if (expandedNotes[clientId]) {
      const updated = { ...expandedNotes };
      delete updated[clientId];
      setExpandedNotes(updated);
      return;
    }
    const { data } = await supabase
      .from("client_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setExpandedNotes({ ...expandedNotes, [clientId]: (data as ClientNote[]) ?? [] });
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

  const statusLabels: Record<string, string> = {
    pending: "待出貨",
    shipped: "已寄送",
    delivered: "已送達",
    cancelled: "已取消",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    shipped: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

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
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4"
        >
          <h2 className="text-xl font-semibold text-primary">新增訂單</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">客戶 *</label>
              <select
                required
                className={inputClass}
                value={form.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">選擇客戶</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">運送方式</label>
              <select
                className={inputClass}
                value={form.shipping_method}
                onChange={(e) =>
                  setForm({ ...form, shipping_method: e.target.value as "" | "delivery" | "convenience_store" })
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
                  <label className="block text-sm font-medium mb-1">門市</label>
                  <input
                    className={inputClass}
                    value={form.store_branch}
                    onChange={(e) => setForm({ ...form, store_branch: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">狀態</label>
              <select
                className={inputClass}
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
                className={inputClass}
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
                  className={inputClass}
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
      )}

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted">尚無訂單</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const notes = order.client_id ? expandedNotes[order.client_id] : undefined;

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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
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
                      <span>
                        {shippingLabels[order.shipping_method]}
                        {order.shipping_method === "delivery" && order.shipping_address && ` — ${order.shipping_address}`}
                        {order.shipping_method === "convenience_store" && (
                          <>
                            {order.store_name && ` — ${order.store_name}`}
                            {order.store_branch && ` ${order.store_branch}`}
                          </>
                        )}
                      </span>
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

                    {/* Linked client feedback */}
                    {order.client_id && (
                      <div className="px-4 py-3">
                        <button
                          onClick={() => toggleNotes(order.client_id!)}
                          className="text-sm font-medium text-primary hover:text-accent"
                        >
                          {notes ? "隱藏客戶回饋 ▲" : "查看客戶回饋 ▼"}
                        </button>
                        {notes && (
                          <div className="mt-2 space-y-2">
                            {notes.length === 0 ? (
                              <p className="text-sm text-muted">此客戶尚無回饋紀錄</p>
                            ) : (
                              notes.map((note) => (
                                <div
                                  key={note.id}
                                  className="px-3 py-2 rounded-lg bg-card border border-border"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                      {noteTypeLabels[note.type] ?? note.type}
                                    </span>
                                    <span className="text-xs text-muted">
                                      {new Date(note.created_at).toLocaleDateString("zh-TW")}
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
                                          onClick={() => window.open(url, "_blank")}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
