"use client";

import { INPUT_CLASS, WORK_STATUS_LABELS } from "@/lib/constants";
import type { Client, Thread, Technique } from "@/lib/types";

// ----- Types shared between new & edit forms -----

export interface WorkFormData {
  client_id: string;
  name: string;
  description: string;
  price: string;
  inspiration: string;
  meaning: string;
  special_notes: string;
  flower_count: string;
  variation_count: string;
  status: string;
}

export interface ThreadRow {
  thread_id: string;
  length_cm: string;
  quantity: string;
}

export interface TechniqueRow {
  technique_id: string;
  usage_count: string;
  notes: string;
}

export const EMPTY_WORK_FORM: WorkFormData = {
  client_id: "",
  name: "",
  description: "",
  price: "",
  inspiration: "",
  meaning: "",
  special_notes: "",
  flower_count: "",
  variation_count: "",
  status: "completed",
};

export const EMPTY_NEW_THREAD = {
  color_name: "",
  color_hex: "#000000",
  material: "",
  thickness_mm: "",
};

// ----- Helper: update a row in an array by index -----

export function updateRow<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

// ----- Inline client creator -----

interface ClientSelectorProps {
  clients: Client[];
  clientId: string;
  onClientIdChange: (id: string) => void;
  showNewClient: boolean;
  setShowNewClient: (v: boolean) => void;
  newClient: string;
  setNewClient: (v: string) => void;
  onAddClient: () => void;
}

export function ClientSelector({
  clients,
  clientId,
  onClientIdChange,
  showNewClient,
  setShowNewClient,
  newClient,
  setNewClient,
  onAddClient,
}: ClientSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">客戶</label>
      {showNewClient ? (
        <div className="flex gap-2">
          <input
            className={INPUT_CLASS}
            placeholder="新客戶名稱"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
          />
          <button
            type="button"
            onClick={onAddClient}
            className="bg-primary text-white px-3 rounded-lg shrink-0"
          >
            新增
          </button>
          <button
            type="button"
            onClick={() => setShowNewClient(false)}
            className="text-muted px-2"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            className={INPUT_CLASS}
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
          >
            <option value="">選擇客戶</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewClient(true)}
            className="text-primary text-sm whitespace-nowrap"
          >
            + 新增
          </button>
        </div>
      )}
    </div>
  );
}

// ----- Basic info section -----

interface BasicInfoSectionProps {
  form: WorkFormData;
  setForm: (f: WorkFormData) => void;
  clients: Client[];
  clientSelectorProps: Omit<ClientSelectorProps, "clients" | "clientId" | "onClientIdChange">;
}

export function BasicInfoSection({
  form,
  setForm,
  clients,
  clientSelectorProps,
}: BasicInfoSectionProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold text-primary">基本資訊</h2>

      <div>
        <label className="block text-sm font-medium mb-1">作品名稱 *</label>
        <input
          required
          className={INPUT_CLASS}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <ClientSelector
        clients={clients}
        clientId={form.client_id}
        onClientIdChange={(id) => setForm({ ...form, client_id: id })}
        {...clientSelectorProps}
      />

      <div>
        <label className="block text-sm font-medium mb-1">狀態</label>
        <select
          className={INPUT_CLASS}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          {Object.entries(WORK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">販賣價格 (NT$)</label>
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">說明</label>
        <textarea
          className={INPUT_CLASS}
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
    </section>
  );
}

// ----- New thread inline form -----

interface NewThreadFormProps {
  newThread: typeof EMPTY_NEW_THREAD;
  setNewThread: (v: typeof EMPTY_NEW_THREAD) => void;
  onAdd: () => void;
  onCancel: () => void;
}

function NewThreadForm({ newThread, setNewThread, onAdd, onCancel }: NewThreadFormProps) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
      <div className="grid grid-cols-2 gap-3">
        <input
          className={INPUT_CLASS}
          placeholder="顏色名稱"
          value={newThread.color_name}
          onChange={(e) => setNewThread({ ...newThread, color_name: e.target.value })}
        />
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={newThread.color_hex}
            onChange={(e) => setNewThread({ ...newThread, color_hex: e.target.value })}
            className="w-10 h-10 rounded cursor-pointer"
          />
          <span className="text-sm text-muted">{newThread.color_hex}</span>
        </div>
        <input
          className={INPUT_CLASS}
          placeholder="材質"
          value={newThread.material}
          onChange={(e) => setNewThread({ ...newThread, material: e.target.value })}
        />
        <input
          className={INPUT_CLASS}
          placeholder="粗細 (mm)"
          type="number"
          step="0.1"
          value={newThread.thickness_mm}
          onChange={(e) => setNewThread({ ...newThread, thickness_mm: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="bg-primary text-white px-3 py-1 rounded-lg text-sm"
        >
          新增線材
        </button>
        <button type="button" onClick={onCancel} className="text-muted text-sm">
          取消
        </button>
      </div>
    </div>
  );
}

// ----- Thread selection section -----

interface ThreadsSectionProps {
  threads: Thread[];
  selectedThreads: ThreadRow[];
  setSelectedThreads: (rows: ThreadRow[]) => void;
  showNewThread: boolean;
  setShowNewThread: (v: boolean) => void;
  newThread: typeof EMPTY_NEW_THREAD;
  setNewThread: (v: typeof EMPTY_NEW_THREAD) => void;
  onAddThread: () => void;
}

export function ThreadsSection({
  threads,
  selectedThreads,
  setSelectedThreads,
  showNewThread,
  setShowNewThread,
  newThread,
  setNewThread,
  onAddThread,
}: ThreadsSectionProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary">使用線材</h2>
        <button
          type="button"
          onClick={() =>
            setSelectedThreads([...selectedThreads, { thread_id: "", length_cm: "", quantity: "1" }])
          }
          className="text-primary text-sm"
        >
          + 新增線材
        </button>
      </div>

      {showNewThread && (
        <NewThreadForm
          newThread={newThread}
          setNewThread={setNewThread}
          onAdd={onAddThread}
          onCancel={() => setShowNewThread(false)}
        />
      )}

      {selectedThreads.map((st, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select
            className={INPUT_CLASS}
            value={st.thread_id}
            onChange={(e) =>
              setSelectedThreads(updateRow(selectedThreads, i, { thread_id: e.target.value }))
            }
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
            onChange={(e) =>
              setSelectedThreads(updateRow(selectedThreads, i, { length_cm: e.target.value }))
            }
          />
          <input
            type="number"
            className="w-16 border border-border rounded-lg px-2 py-2 bg-card"
            placeholder="數量"
            value={st.quantity}
            onChange={(e) =>
              setSelectedThreads(updateRow(selectedThreads, i, { quantity: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() => setSelectedThreads(selectedThreads.filter((_, j) => j !== i))}
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
  );
}

// ----- Technique selection section -----

interface TechniquesSectionProps {
  techniques: Technique[];
  selectedTechniques: TechniqueRow[];
  setSelectedTechniques: (rows: TechniqueRow[]) => void;
}

export function TechniquesSection({
  techniques,
  selectedTechniques,
  setSelectedTechniques,
}: TechniquesSectionProps) {
  return (
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
            className={INPUT_CLASS}
            value={st.technique_id}
            onChange={(e) =>
              setSelectedTechniques(
                updateRow(selectedTechniques, i, { technique_id: e.target.value })
              )
            }
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
            onChange={(e) =>
              setSelectedTechniques(
                updateRow(selectedTechniques, i, { usage_count: e.target.value })
              )
            }
          />
          <input
            className="flex-1 border border-border rounded-lg px-2 py-2 bg-card"
            placeholder="備註"
            value={st.notes}
            onChange={(e) =>
              setSelectedTechniques(updateRow(selectedTechniques, i, { notes: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() =>
              setSelectedTechniques(selectedTechniques.filter((_, j) => j !== i))
            }
            className="text-red-400 hover:text-red-600"
          >
            x
          </button>
        </div>
      ))}
    </section>
  );
}

// ----- Work details section (inspiration, meaning, etc.) -----

interface DetailsSectionProps {
  form: WorkFormData;
  setForm: (f: WorkFormData) => void;
}

export function DetailsSection({ form, setForm }: DetailsSectionProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold text-primary">作品細節</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">花朵數量</label>
          <input
            type="number"
            className={INPUT_CLASS}
            value={form.flower_count}
            onChange={(e) => setForm({ ...form, flower_count: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">變化數量</label>
          <input
            type="number"
            className={INPUT_CLASS}
            value={form.variation_count}
            onChange={(e) => setForm({ ...form, variation_count: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">靈感來源</label>
        <textarea
          className={INPUT_CLASS}
          rows={2}
          value={form.inspiration}
          onChange={(e) => setForm({ ...form, inspiration: e.target.value })}
          placeholder="這件作品的靈感從何而來？"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">寓意</label>
        <textarea
          className={INPUT_CLASS}
          rows={2}
          value={form.meaning}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          placeholder="這件作品想傳達什麼？"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">特別之處</label>
        <textarea
          className={INPUT_CLASS}
          rows={2}
          value={form.special_notes}
          onChange={(e) => setForm({ ...form, special_notes: e.target.value })}
          placeholder="有什麼特別值得記錄的？"
        />
      </div>
    </section>
  );
}
