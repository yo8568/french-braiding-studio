"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Thread } from "@/lib/types";

interface CordPreset {
  id: string;
  knot_type: string;
  multiplier: number;
  description: string;
  cord1_multiplier: number;
  cord2_multiplier: number;
  cord3_multiplier: number;
}

interface Arrangement {
  id: string;
  cord_preset_id: string;
  name: string;
  cord1_multiplier: number;
  cord2_multiplier: number;
  cord3_multiplier: number;
}

interface Section {
  knot_type: string;
  arrangement_id: string;
  length_cm: string;
  cord1_mult: string;
  cord2_mult: string;
  cord3_mult: string;
}

const EMPTY_SECTION: Section = {
  knot_type: "",
  arrangement_id: "",
  length_cm: "",
  cord1_mult: "",
  cord2_mult: "",
  cord3_mult: "",
};

export default function CalculatorPage() {
  const supabase = createClient();
  const [presets, setPresets] = useState<CordPreset[]>([]);
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sections, setSections] = useState<Section[]>([{ ...EMPTY_SECTION }]);
  const [selectedThreadIds, setSelectedThreadIds] = useState(["", "", ""]);

  // Preset management
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CordPreset | null>(null);
  const [presetForm, setPresetForm] = useState({
    knot_type: "", multiplier: "", description: "",
    cord1_multiplier: "", cord2_multiplier: "", cord3_multiplier: "",
  });

  // Arrangement management
  const [showArrForm, setShowArrForm] = useState(false);
  const [editingArr, setEditingArr] = useState<Arrangement | null>(null);
  const [arrForm, setArrForm] = useState({
    cord_preset_id: "",
    name: "",
    cord1_multiplier: "",
    cord2_multiplier: "",
    cord3_multiplier: "",
  });

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    const [p, a, t] = await Promise.all([
      supabase.from("cord_presets").select("*").order("knot_type"),
      supabase.from("knot_arrangements").select("*").order("name"),
      supabase.from("threads").select("*").order("color_name"),
    ]);
    if (p.data) setPresets(p.data);
    if (a.data) setArrangements(a.data);
    if (t.data) setThreads(t.data);
  }

  function getCordName(index: number): string {
    const threadId = selectedThreadIds[index];
    const thread = threads.find((t) => t.id === threadId);
    return thread ? `${thread.color_name}${thread.material ? ` (${thread.material})` : ""}` : `線${index + 1}`;
  }

  // --- Preset CRUD ---
  function resetPresetForm() {
    setPresetForm({ knot_type: "", multiplier: "", description: "", cord1_multiplier: "", cord2_multiplier: "", cord3_multiplier: "" });
    setEditingPreset(null);
    setShowPresetForm(false);
  }

  function handleEditPreset(p: CordPreset) {
    setPresetForm({
      knot_type: p.knot_type, multiplier: p.multiplier.toString(), description: p.description ?? "",
      cord1_multiplier: p.cord1_multiplier?.toString() ?? "",
      cord2_multiplier: p.cord2_multiplier?.toString() ?? "",
      cord3_multiplier: p.cord3_multiplier?.toString() ?? "",
    });
    setEditingPreset(p);
    setShowPresetForm(true);
  }

  async function handleSubmitPreset(e: React.FormEvent) {
    e.preventDefault();
    if (!presetForm.knot_type.trim() || !presetForm.multiplier) return;
    const payload = {
      knot_type: presetForm.knot_type.trim(),
      multiplier: parseFloat(presetForm.multiplier) || 0,
      description: presetForm.description || null,
      cord1_multiplier: parseFloat(presetForm.cord1_multiplier) || 0,
      cord2_multiplier: parseFloat(presetForm.cord2_multiplier) || 0,
      cord3_multiplier: parseFloat(presetForm.cord3_multiplier) || 0,
    };
    if (editingPreset) {
      await supabase.from("cord_presets").update(payload).eq("id", editingPreset.id);
    } else {
      await supabase.from("cord_presets").insert(payload);
    }
    resetPresetForm();
    loadAll();
  }

  async function handleDeletePreset(id: string) {
    if (!confirm("確定要刪除？相關搭配方式也會被刪除。")) return;
    await supabase.from("knot_arrangements").delete().eq("cord_preset_id", id);
    await supabase.from("cord_presets").delete().eq("id", id);
    loadAll();
  }

  // --- Arrangement CRUD ---
  function resetArrForm() {
    setArrForm({ cord_preset_id: "", name: "", cord1_multiplier: "", cord2_multiplier: "", cord3_multiplier: "" });
    setEditingArr(null);
    setShowArrForm(false);
  }

  function handleEditArr(a: Arrangement) {
    setArrForm({
      cord_preset_id: a.cord_preset_id,
      name: a.name,
      cord1_multiplier: a.cord1_multiplier.toString(),
      cord2_multiplier: a.cord2_multiplier.toString(),
      cord3_multiplier: a.cord3_multiplier.toString(),
    });
    setEditingArr(a);
    setShowArrForm(true);
  }

  async function handleSubmitArr(e: React.FormEvent) {
    e.preventDefault();
    if (!arrForm.cord_preset_id || !arrForm.name.trim()) return;
    const payload = {
      cord_preset_id: arrForm.cord_preset_id,
      name: arrForm.name.trim(),
      cord1_multiplier: parseFloat(arrForm.cord1_multiplier) || 1,
      cord2_multiplier: parseFloat(arrForm.cord2_multiplier) || 1,
      cord3_multiplier: parseFloat(arrForm.cord3_multiplier) || 1,
    };
    if (editingArr) {
      await supabase.from("knot_arrangements").update(payload).eq("id", editingArr.id);
    } else {
      await supabase.from("knot_arrangements").insert(payload);
    }
    resetArrForm();
    loadAll();
  }

  async function handleDeleteArr(id: string) {
    await supabase.from("knot_arrangements").delete().eq("id", id);
    loadAll();
  }

  // --- Section logic ---
  function updateSection(i: number, field: keyof Section, value: string) {
    const updated = [...sections];
    updated[i] = { ...updated[i], [field]: value };
    setSections(updated);
  }

  function handleSelectKnot(i: number, knotType: string) {
    const preset = presets.find((p) => p.knot_type === knotType);
    const updated = [...sections];
    updated[i] = {
      ...updated[i],
      knot_type: knotType,
      arrangement_id: "",
      cord1_mult: preset?.cord1_multiplier?.toString() ?? "",
      cord2_mult: preset?.cord2_multiplier?.toString() ?? "",
      cord3_mult: preset?.cord3_multiplier?.toString() ?? "",
    };
    setSections(updated);
  }

  function handleSelectArrangement(i: number, arrId: string) {
    const arr = arrangements.find((a) => a.id === arrId);
    const updated = [...sections];
    updated[i] = {
      ...updated[i],
      arrangement_id: arrId,
      cord1_mult: arr ? arr.cord1_multiplier.toString() : "",
      cord2_mult: arr ? arr.cord2_multiplier.toString() : "",
      cord3_mult: arr ? arr.cord3_multiplier.toString() : "",
    };
    setSections(updated);
  }

  function getCordLengths(s: Section) {
    const len = parseFloat(s.length_cm) || 0;
    return [
      len * (parseFloat(s.cord1_mult) || 0),
      len * (parseFloat(s.cord2_mult) || 0),
      len * (parseFloat(s.cord3_mult) || 0),
    ];
  }

  // Totals per cord
  const cordTotals = [0, 0, 0];
  let totalFinished = 0;
  for (const s of sections) {
    const lengths = getCordLengths(s);
    cordTotals[0] += lengths[0];
    cordTotals[1] += lengths[1];
    cordTotals[2] += lengths[2];
    totalFinished += parseFloat(s.length_cm) || 0;
  }
  const grandTotal = cordTotals[0] + cordTotals[1] + cordTotals[2];

  function fmt(cm: number) {
    if (cm >= 100) return `${cm.toFixed(1)} cm (${(cm / 100).toFixed(2)} m)`;
    return `${cm.toFixed(1)} cm`;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">繩長計算機</h1>
        <p className="text-muted mt-2">
          一條作品由 3 條線、多種繩結段落組成，每段可選不同搭配方式
        </p>
      </div>

      {/* Cord selection */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium mb-2">選擇三條線材</p>
        <div className="grid grid-cols-3 gap-3">
          {selectedThreadIds.map((threadId, i) => {
            const selected = threads.find((t) => t.id === threadId);
            return (
              <div key={i}>
                <label className="block text-xs text-muted mb-1">線 {i + 1}</label>
                <div className="flex items-center gap-2">
                  {selected && (
                    <div
                      className="w-6 h-6 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: selected.color_hex }}
                    />
                  )}
                  <select
                    className={INPUT_CLASS}
                    value={threadId}
                    onChange={(e) => {
                      const updated = [...selectedThreadIds];
                      updated[i] = e.target.value;
                      setSelectedThreadIds(updated);
                    }}
                  >
                    <option value="">選擇線材</option>
                    {threads.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.color_name} {t.material ? `(${t.material})` : ""} {t.thickness_mm ? `${t.thickness_mm}mm` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">作品段落</h2>
          <button
            onClick={() => setSections([...sections, { ...EMPTY_SECTION }])}
            className="text-primary text-sm hover:text-accent"
          >
            + 新增段落
          </button>
        </div>

        {sections.map((section, i) => {
          const preset = presets.find((p) => p.knot_type === section.knot_type);
          const knotArrangements = preset
            ? arrangements.filter((a) => a.cord_preset_id === preset.id)
            : [];
          const cordLengths = getCordLengths(section);

          return (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">段落 {i + 1}</span>
                {sections.length > 1 && (
                  <button
                    onClick={() => setSections(sections.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    移除
                  </button>
                )}
              </div>

              {/* Knot type */}
              <div>
                <label className="block text-xs text-muted mb-1">結型</label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectKnot(i, p.knot_type)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        section.knot_type === p.knot_type
                          ? "bg-primary text-white"
                          : "bg-card border border-border hover:bg-border"
                      }`}
                    >
                      {p.knot_type}
                      <span className="opacity-70 ml-0.5">({p.cord1_multiplier}/{p.cord2_multiplier}/{p.cord3_multiplier})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrangement */}
              {section.knot_type && knotArrangements.length > 0 && (
                <div>
                  <label className="block text-xs text-muted mb-1">搭配方式</label>
                  <div className="flex flex-wrap gap-1.5">
                    {knotArrangements.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelectArrangement(i, a.id)}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                          section.arrangement_id === a.id
                            ? "bg-accent text-white"
                            : "bg-card border border-border hover:bg-border"
                        }`}
                      >
                        {a.name}
                        <span className="opacity-70 ml-1">
                          ({a.cord1_multiplier}/{a.cord2_multiplier}/{a.cord3_multiplier})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Length + per-cord multipliers */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-1">長度 (cm)</label>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={section.length_cm}
                    onChange={(e) => updateSection(i, "length_cm", e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(0)} 倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={section.cord1_mult}
                    onChange={(e) => updateSection(i, "cord1_mult", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(1)} 倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={section.cord2_mult}
                    onChange={(e) => updateSection(i, "cord2_mult", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(2)} 倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={section.cord3_mult}
                    onChange={(e) => updateSection(i, "cord3_mult", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Section result */}
              {(cordLengths[0] > 0 || cordLengths[1] > 0 || cordLengths[2] > 0) && (
                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  {cordLengths.map((len, ci) => (
                    <span key={ci}>
                      {getCordName(ci)}: <strong className="text-primary">{len.toFixed(1)} cm</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Grand totals */}
        <div className="bg-background rounded-xl p-6 space-y-4">
          <p className="text-sm text-muted text-center mb-1">
            成品總長: {fmt(totalFinished)}
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {cordTotals.map((total, i) => (
              <div key={i}>
                <p className="text-sm text-muted">{getCordName(i)}</p>
                <p className="text-2xl font-bold text-primary">
                  {total.toFixed(1)} <span className="text-sm">cm</span>
                </p>
                {total >= 100 && (
                  <p className="text-xs text-muted">= {(total / 100).toFixed(2)} m</p>
                )}
              </div>
            ))}
          </div>
          <div className="text-center pt-2 border-t border-border">
            <p className="text-sm text-muted">三條線總計</p>
            <p className="text-3xl font-bold text-accent">
              {grandTotal.toFixed(1)} <span className="text-base">cm</span>
            </p>
            {grandTotal >= 100 && (
              <p className="text-sm text-muted">= {(grandTotal / 100).toFixed(2)} m</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted text-center">
          提示：實際用量可能因個人手勁、結的鬆緊而有差異，建議多預留 10-15%
        </p>
      </div>

      {/* Knot types & arrangements management */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Knot types */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-primary">結型管理</h2>
            <button
              onClick={() => { resetPresetForm(); setShowPresetForm(true); }}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              + 新增結型
            </button>
          </div>

          {showPresetForm && (
            <form onSubmit={handleSubmitPreset} className="border border-border rounded-lg p-4 mb-4 space-y-3 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">結型名稱 *</label>
                  <input required className={INPUT_CLASS} value={presetForm.knot_type}
                    onChange={(e) => setPresetForm({ ...presetForm, knot_type: e.target.value })} placeholder="例：平結" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">基本倍率</label>
                  <input type="number" step="0.1" className={INPUT_CLASS} value={presetForm.multiplier}
                    onChange={(e) => setPresetForm({ ...presetForm, multiplier: e.target.value })} placeholder="參考用" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">說明</label>
                  <input className={INPUT_CLASS} value={presetForm.description}
                    onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(0)} 倍率</label>
                  <input type="number" step="0.1" className={INPUT_CLASS} value={presetForm.cord1_multiplier}
                    onChange={(e) => setPresetForm({ ...presetForm, cord1_multiplier: e.target.value })} placeholder="例：1" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(1)} 倍率</label>
                  <input type="number" step="0.1" className={INPUT_CLASS} value={presetForm.cord2_multiplier}
                    onChange={(e) => setPresetForm({ ...presetForm, cord2_multiplier: e.target.value })} placeholder="例：4" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(2)} 倍率</label>
                  <input type="number" step="0.1" className={INPUT_CLASS} value={presetForm.cord3_multiplier}
                    onChange={(e) => setPresetForm({ ...presetForm, cord3_multiplier: e.target.value })} placeholder="例：4" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-primary text-white px-4 py-1 rounded-lg text-sm">{editingPreset ? "更新" : "新增"}</button>
                <button type="button" onClick={resetPresetForm} className="text-muted text-sm">取消</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {presets.map((p) => {
              const pArrs = arrangements.filter((a) => a.cord_preset_id === p.id);
              return (
                <div key={p.id} className="border border-border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{p.knot_type}</span>
                      <span className="text-xs text-muted ml-2">
                        ({p.cord1_multiplier}/{p.cord2_multiplier}/{p.cord3_multiplier})
                      </span>
                      {p.description && <span className="text-xs text-muted ml-1">{p.description}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPreset(p)} className="text-primary text-xs">編輯</button>
                      <button onClick={() => handleDeletePreset(p.id)} className="text-red-400 text-xs">刪除</button>
                    </div>
                  </div>
                  {/* Arrangements for this knot */}
                  {pArrs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {pArrs.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-xs bg-card rounded px-2 py-1.5">
                          <span>
                            <strong>{a.name}</strong>
                            <span className="text-muted ml-2">
                              {getCordName(0)}:x{a.cord1_multiplier} / {getCordName(1)}:x{a.cord2_multiplier} / {getCordName(2)}:x{a.cord3_multiplier}
                            </span>
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditArr(a)} className="text-primary">編輯</button>
                            <button onClick={() => handleDeleteArr(a.id)} className="text-red-400">刪除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrangement form */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-primary">搭配方式管理</h3>
            <button
              onClick={() => { resetArrForm(); setShowArrForm(true); }}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              + 新增搭配
            </button>
          </div>

          {showArrForm && (
            <form onSubmit={handleSubmitArr} className="border border-border rounded-lg p-4 space-y-3 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">結型 *</label>
                  <select required className={INPUT_CLASS} value={arrForm.cord_preset_id}
                    onChange={(e) => setArrForm({ ...arrForm, cord_preset_id: e.target.value })}>
                    <option value="">選擇結型</option>
                    {presets.map((p) => <option key={p.id} value={p.id}>{p.knot_type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">搭配名稱 *</label>
                  <input required className={INPUT_CLASS} value={arrForm.name}
                    onChange={(e) => setArrForm({ ...arrForm, name: e.target.value })}
                    placeholder="例：芯線在中" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(0)} 倍率 *</label>
                  <input required type="number" step="0.1" className={INPUT_CLASS} value={arrForm.cord1_multiplier}
                    onChange={(e) => setArrForm({ ...arrForm, cord1_multiplier: e.target.value })} placeholder="例：1" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(1)} 倍率 *</label>
                  <input required type="number" step="0.1" className={INPUT_CLASS} value={arrForm.cord2_multiplier}
                    onChange={(e) => setArrForm({ ...arrForm, cord2_multiplier: e.target.value })} placeholder="例：4" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">{getCordName(2)} 倍率 *</label>
                  <input required type="number" step="0.1" className={INPUT_CLASS} value={arrForm.cord3_multiplier}
                    onChange={(e) => setArrForm({ ...arrForm, cord3_multiplier: e.target.value })} placeholder="例：4" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-primary text-white px-4 py-1 rounded-lg text-sm">{editingArr ? "更新" : "新增"}</button>
                <button type="button" onClick={resetArrForm} className="text-muted text-sm">取消</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
