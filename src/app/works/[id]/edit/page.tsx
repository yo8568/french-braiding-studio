"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { uploadImages } from "@/lib/upload";
import { buildWorkPayload, saveWorkThreads, saveWorkTechniques, addClient, addThread } from "@/lib/work-helpers";
import { INPUT_CLASS } from "@/lib/constants";
import type { Client, Thread, Technique } from "@/lib/types";
import {
  EMPTY_WORK_FORM,
  EMPTY_NEW_THREAD,
  BasicInfoSection,
  ThreadsSection,
  TechniquesSection,
  DetailsSection,
  type WorkFormData,
  type ThreadRow,
  type TechniqueRow,
} from "@/app/components/WorkFormSections";

export default function EditWorkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<WorkFormData>(EMPTY_WORK_FORM);
  const [selectedThreads, setSelectedThreads] = useState<ThreadRow[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<TechniqueRow[]>([]);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

  // Inline creation state
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newThread, setNewThread] = useState(EMPTY_NEW_THREAD);
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [c, t, tech, workRes, wtRes, wteRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("threads").select("*").order("color_name"),
        supabase.from("techniques").select("*").order("name"),
        supabase.from("works").select("*").eq("id", params.id).single(),
        supabase.from("work_threads").select("*").eq("work_id", params.id),
        supabase.from("work_techniques").select("*").eq("work_id", params.id),
      ]);

      setClients(c.data ?? []);
      setThreads(t.data ?? []);
      setTechniques(tech.data ?? []);

      if (workRes.data) {
        const w = workRes.data;
        setForm({
          client_id: w.client_id ?? "",
          name: w.name ?? "",
          description: w.description ?? "",
          price: w.price?.toString() ?? "",
          inspiration: w.inspiration ?? "",
          meaning: w.meaning ?? "",
          special_notes: w.special_notes ?? "",
          flower_count: w.flower_count?.toString() ?? "",
          variation_count: w.variation_count?.toString() ?? "",
          status: w.status ?? "completed",
        });
        setExistingImages(w.image_urls ?? []);
      }

      if (wtRes.data) {
        setSelectedThreads(
          wtRes.data.map((wt: { thread_id: string; length_cm: number; quantity: number }) => ({
            thread_id: wt.thread_id,
            length_cm: wt.length_cm.toString(),
            quantity: wt.quantity.toString(),
          }))
        );
      }

      if (wteRes.data) {
        setSelectedTechniques(
          wteRes.data.map((wt: { technique_id: string; usage_count: number; notes: string | null }) => ({
            technique_id: wt.technique_id,
            usage_count: wt.usage_count.toString(),
            notes: wt.notes ?? "",
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleAddClient() {
    if (!newClient.trim()) return;
    const data = await addClient(newClient);
    if (data) {
      setClients((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, client_id: data.id }));
      setNewClient("");
      setShowNewClient(false);
    }
  }

  async function handleAddThread() {
    if (!newThread.color_name.trim()) return;
    const data = await addThread(newThread);
    if (data) {
      setThreads((prev) => [...prev, data]);
      setNewThread(EMPTY_NEW_THREAD);
      setShowNewThread(false);
    }
  }

  function handleRemoveExistingImage(url: string) {
    setImagesToRemove((prev) => [...prev, url]);
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();

      const newImageUrls = await uploadImages(newImageFiles);

      // Delete removed images from storage
      for (const url of imagesToRemove) {
        const storagePath = url.split("/work-images/").pop();
        if (storagePath) {
          await supabase.storage.from("work-images").remove([storagePath]);
        }
      }

      const allImageUrls = [...existingImages, ...newImageUrls];

      const { error } = await supabase
        .from("works")
        .update(buildWorkPayload(form, allImageUrls))
        .eq("id", params.id);

      if (error) throw error;

      // Replace work_threads and work_techniques
      await Promise.all([
        supabase.from("work_threads").delete().eq("work_id", params.id),
        supabase.from("work_techniques").delete().eq("work_id", params.id),
      ]);

      await Promise.all([
        saveWorkThreads(params.id, selectedThreads),
        saveWorkTechniques(params.id, selectedTechniques),
      ]);

      router.push(`/works/${params.id}`);
    } catch (err) {
      console.error(err);
      alert("儲存失敗，請重試");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="text-center py-16 text-muted">載入中...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">編輯作品</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <BasicInfoSection
          form={form}
          setForm={setForm}
          clients={clients}
          clientSelectorProps={{
            showNewClient,
            setShowNewClient,
            newClient,
            setNewClient,
            onAddClient: handleAddClient,
          }}
        />

        {/* Images with existing preview */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">成品圖片</h2>

          {existingImages.length > 0 && (
            <div>
              <p className="text-sm text-muted mb-2">現有圖片（點擊移除）</p>
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`現有圖片 ${i + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(url)}
                      className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted mb-1">上傳新圖片</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewImageFiles(Array.from(e.target.files ?? []))}
              className={INPUT_CLASS}
            />
            {newImageFiles.length > 0 && (
              <p className="text-sm text-muted mt-1">
                已選擇 {newImageFiles.length} 張新圖片
              </p>
            )}
          </div>
        </section>

        <ThreadsSection
          threads={threads}
          selectedThreads={selectedThreads}
          setSelectedThreads={setSelectedThreads}
          showNewThread={showNewThread}
          setShowNewThread={setShowNewThread}
          newThread={newThread}
          setNewThread={setNewThread}
          onAddThread={handleAddThread}
        />

        <TechniquesSection
          techniques={techniques}
          selectedTechniques={selectedTechniques}
          setSelectedTechniques={setSelectedTechniques}
        />

        <DetailsSection form={form} setForm={setForm} />

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push(`/works/${params.id}`)}
            className="flex-1 border border-border py-3 rounded-xl font-semibold hover:bg-card transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? "儲存中..." : "更新作品"}
          </button>
        </div>
      </form>
    </div>
  );
}
