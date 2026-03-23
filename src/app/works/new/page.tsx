"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Creator, Thread, Technique } from "@/lib/types";

export default function NewWorkPage() {
  const router = useRouter();
  const supabase = createClient();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    creator_id: "",
    name: "",
    description: "",
    price: "",
    inspiration: "",
    meaning: "",
    special_notes: "",
    flower_count: "",
    variation_count: "",
    status: "completed",
  });

  const [selectedThreads, setSelectedThreads] = useState<
    { thread_id: string; length_cm: string; quantity: string }[]
  >([]);

  const [selectedTechniques, setSelectedTechniques] = useState<
    { technique_id: string; usage_count: string; notes: string }[]
  >([]);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [newCreator, setNewCreator] = useState("");
  const [newThread, setNewThread] = useState({
    color_name: "",
    color_hex: "#000000",
    material: "",
    thickness_mm: "",
  });
  const [showNewCreator, setShowNewCreator] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    async function load() {
      const [c, t, tech] = await Promise.all([
        supabase.from("creators").select("*").order("name"),
        supabase.from("threads").select("*").order("color_name"),
        supabase.from("techniques").select("*").order("name"),
      ]);
      setCreators(c.data ?? []);
      setThreads(t.data ?? []);
      setTechniques(tech.data ?? []);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddCreator() {
    if (!newCreator.trim()) return;
    const { data } = await supabase
      .from("creators")
      .insert({ name: newCreator.trim() })
      .select()
      .single();
    if (data) {
      setCreators((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, creator_id: data.id }));
      setNewCreator("");
      setShowNewCreator(false);
    }
  }

  async function handleAddThread() {
    if (!newThread.color_name.trim()) return;
    const { data } = await supabase
      .from("threads")
      .insert({
        color_name: newThread.color_name.trim(),
        color_hex: newThread.color_hex,
        material: newThread.material || null,
        thickness_mm: newThread.thickness_mm
          ? parseFloat(newThread.thickness_mm)
          : null,
      })
      .select()
      .single();
    if (data) {
      setThreads((prev) => [...prev, data]);
      setNewThread({
        color_name: "",
        color_hex: "#000000",
        material: "",
        thickness_mm: "",
      });
      setShowNewThread(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("work-images")
          .upload(path, file);
        if (!error) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("work-images").getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }

      // Create work
      const { data: work, error: workError } = await supabase
        .from("works")
        .insert({
          creator_id: form.creator_id || null,
          name: form.name,
          description: form.description || null,
          image_urls: imageUrls,
          price: form.price ? parseFloat(form.price) : null,
          inspiration: form.inspiration || null,
          meaning: form.meaning || null,
          special_notes: form.special_notes || null,
          flower_count: form.flower_count ? parseInt(form.flower_count) : 0,
          variation_count: form.variation_count
            ? parseInt(form.variation_count)
            : 0,
          status: form.status,
        })
        .select()
        .single();

      if (workError) throw workError;

      // Insert work_threads
      if (selectedThreads.length > 0) {
        await supabase.from("work_threads").insert(
          selectedThreads
            .filter((t) => t.thread_id)
            .map((t) => ({
              work_id: work.id,
              thread_id: t.thread_id,
              length_cm: parseFloat(t.length_cm) || 0,
              quantity: parseInt(t.quantity) || 1,
            }))
        );
      }

      // Insert work_techniques
      if (selectedTechniques.length > 0) {
        await supabase.from("work_techniques").insert(
          selectedTechniques
            .filter((t) => t.technique_id)
            .map((t) => ({
              work_id: work.id,
              technique_id: t.technique_id,
              usage_count: parseInt(t.usage_count) || 1,
              notes: t.notes || null,
            }))
        );
      }

      router.push(`/works/${work.id}`);
    } catch (err) {
      console.error(err);
      alert("儲存失敗，請重試");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">新增作品</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">基本資訊</h2>

          <div>
            <label className="block text-sm font-medium mb-1">作品名稱 *</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">編織者</label>
            {showNewCreator ? (
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="新編織者名稱"
                  value={newCreator}
                  onChange={(e) => setNewCreator(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddCreator}
                  className="bg-primary text-white px-3 rounded-lg shrink-0"
                >
                  新增
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCreator(false)}
                  className="text-muted px-2"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  className={inputClass}
                  value={form.creator_id}
                  onChange={(e) =>
                    setForm({ ...form, creator_id: e.target.value })
                  }
                >
                  <option value="">選擇編織者</option>
                  {creators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCreator(true)}
                  className="text-primary text-sm whitespace-nowrap"
                >
                  + 新增
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">狀態</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="in_progress">製作中</option>
              <option value="completed">已完成</option>
              <option value="for_sale">販售中</option>
              <option value="sold">已售出</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              販賣價格 (NT$)
            </label>
            <input
              type="number"
              className={inputClass}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
        </section>

        {/* Images */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">成品圖片</h2>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setImageFiles(Array.from(e.target.files ?? []))
            }
            className={inputClass}
          />
          {imageFiles.length > 0 && (
            <p className="text-sm text-muted">已選擇 {imageFiles.length} 張圖片</p>
          )}
        </section>

        {/* Threads */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">使用線材</h2>
            <button
              type="button"
              onClick={() =>
                setSelectedThreads([
                  ...selectedThreads,
                  { thread_id: "", length_cm: "", quantity: "1" },
                ])
              }
              className="text-primary text-sm"
            >
              + 新增線材
            </button>
          </div>

          {showNewThread && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="顏色名稱"
                  value={newThread.color_name}
                  onChange={(e) =>
                    setNewThread({ ...newThread, color_name: e.target.value })
                  }
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newThread.color_hex}
                    onChange={(e) =>
                      setNewThread({ ...newThread, color_hex: e.target.value })
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-muted">{newThread.color_hex}</span>
                </div>
                <input
                  className={inputClass}
                  placeholder="材質"
                  value={newThread.material}
                  onChange={(e) =>
                    setNewThread({ ...newThread, material: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="粗細 (mm)"
                  type="number"
                  step="0.1"
                  value={newThread.thickness_mm}
                  onChange={(e) =>
                    setNewThread({ ...newThread, thickness_mm: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddThread}
                  className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
                >
                  新增線材
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewThread(false)}
                  className="text-muted text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {selectedThreads.map((st, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                className={inputClass}
                value={st.thread_id}
                onChange={(e) => {
                  const updated = [...selectedThreads];
                  updated[i].thread_id = e.target.value;
                  setSelectedThreads(updated);
                }}
              >
                <option value="">選擇線材</option>
                {threads.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.color_name} ({t.material ?? "未標"})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="w-24 border border-border rounded-lg px-2 py-2 bg-card"
                placeholder="長度cm"
                value={st.length_cm}
                onChange={(e) => {
                  const updated = [...selectedThreads];
                  updated[i].length_cm = e.target.value;
                  setSelectedThreads(updated);
                }}
              />
              <input
                type="number"
                className="w-16 border border-border rounded-lg px-2 py-2 bg-card"
                placeholder="數量"
                value={st.quantity}
                onChange={(e) => {
                  const updated = [...selectedThreads];
                  updated[i].quantity = e.target.value;
                  setSelectedThreads(updated);
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedThreads(selectedThreads.filter((_, j) => j !== i))
                }
                className="text-red-400 hover:text-red-600"
              >
                x
              </button>
            </div>
          ))}

          {!showNewThread && (
            <button
              type="button"
              onClick={() => setShowNewThread(true)}
              className="text-sm text-muted hover:text-primary"
            >
              找不到線材？建立新的線材
            </button>
          )}
        </section>

        {/* Techniques */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">使用編法</h2>
            <button
              type="button"
              onClick={() =>
                setSelectedTechniques([
                  ...selectedTechniques,
                  { technique_id: "", usage_count: "1", notes: "" },
                ])
              }
              className="text-primary text-sm"
            >
              + 新增編法
            </button>
          </div>

          {selectedTechniques.map((st, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                className={inputClass}
                value={st.technique_id}
                onChange={(e) => {
                  const updated = [...selectedTechniques];
                  updated[i].technique_id = e.target.value;
                  setSelectedTechniques(updated);
                }}
              >
                <option value="">選擇編法</option>
                {techniques.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (難度 {t.difficulty})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="w-20 border border-border rounded-lg px-2 py-2 bg-card"
                placeholder="次數"
                value={st.usage_count}
                onChange={(e) => {
                  const updated = [...selectedTechniques];
                  updated[i].usage_count = e.target.value;
                  setSelectedTechniques(updated);
                }}
              />
              <input
                className="flex-1 border border-border rounded-lg px-2 py-2 bg-card"
                placeholder="備註"
                value={st.notes}
                onChange={(e) => {
                  const updated = [...selectedTechniques];
                  updated[i].notes = e.target.value;
                  setSelectedTechniques(updated);
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedTechniques(
                    selectedTechniques.filter((_, j) => j !== i)
                  )
                }
                className="text-red-400 hover:text-red-600"
              >
                x
              </button>
            </div>
          ))}
        </section>

        {/* Details */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">作品細節</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">花朵數量</label>
              <input
                type="number"
                className={inputClass}
                value={form.flower_count}
                onChange={(e) =>
                  setForm({ ...form, flower_count: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">變化數量</label>
              <input
                type="number"
                className={inputClass}
                value={form.variation_count}
                onChange={(e) =>
                  setForm({ ...form, variation_count: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">靈感來源</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.inspiration}
              onChange={(e) =>
                setForm({ ...form, inspiration: e.target.value })
              }
              placeholder="這件作品的靈感從何而來？"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">寓意</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.meaning}
              onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              placeholder="這件作品想傳達什麼？"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">特別之處</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.special_notes}
              onChange={(e) =>
                setForm({ ...form, special_notes: e.target.value })
              }
              placeholder="有什麼特別值得記錄的？"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-accent transition-colors disabled:opacity-50"
        >
          {saving ? "儲存中..." : "儲存作品"}
        </button>
      </form>
    </div>
  );
}
