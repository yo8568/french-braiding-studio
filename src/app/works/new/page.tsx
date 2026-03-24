"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { useRouter } from "next/navigation";
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

export default function NewWorkPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<WorkFormData>(EMPTY_WORK_FORM);
  const [selectedThreads, setSelectedThreads] = useState<ThreadRow[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<TechniqueRow[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Inline creation state
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newThread, setNewThread] = useState(EMPTY_NEW_THREAD);
  const [showNewThread, setShowNewThread] = useState(false);

  usePageShow(() => {
    const supabase = createClient();
    async function load() {
      const [c, t, tech] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("threads").select("*").order("color_name"),
        supabase.from("techniques").select("*").order("name"),
      ]);
      setClients(c.data ?? []);
      setThreads(t.data ?? []);
      setTechniques(tech.data ?? []);
    }
    load();
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const imageUrls = await uploadImages(imageFiles);
      const supabase = createClient();

      const { data: work, error } = await supabase
        .from("works")
        .insert(buildWorkPayload(form, imageUrls))
        .select()
        .single();

      if (error) throw error;

      await Promise.all([
        saveWorkThreads(work.id, selectedThreads),
        saveWorkTechniques(work.id, selectedTechniques),
      ]);

      router.push(`/works/${work.id}`);
    } catch (err) {
      console.error(err);
      alert("儲存失敗，請重試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">新增作品</h1>

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

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">成品圖片</h2>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
            className={INPUT_CLASS}
          />
          {imageFiles.length > 0 && (
            <p className="text-sm text-muted">已選擇 {imageFiles.length} 張圖片</p>
          )}
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
