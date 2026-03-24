"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";

interface CordPreset {
  id: string;
  knot_type: string;
  multiplier: number;
  description: string;
}

interface Section {
  knot_type: string;
  length_cm: string;
  cord_count: string;
  custom_multiplier: string;
}

const EMPTY_SECTION: Section = { knot_type: "", length_cm: "", cord_count: "1", custom_multiplier: "" };

export default function CalculatorPage() {
  const supabase = createClient();
  const [presets, setPresets] = useState<CordPreset[]>([]);
  const [sections, setSections] = useState<Section[]>([{ ...EMPTY_SECTION }]);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CordPreset | null>(null);
  const [presetForm, setPresetForm] = useState({ knot_type: "", multiplier: "", description: "" });

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPresets() {
    const { data } = await supabase
      .from("cord_presets")
      .select("*")
      .order("knot_type");
    if (data) setPresets(data);
  }

  function resetPresetForm() {
    setPresetForm({ knot_type: "", multiplier: "", description: "" });
    setEditingPreset(null);
    setShowPresetForm(false);
  }

  function handleEditPreset(p: CordPreset) {
    setPresetForm({
      knot_type: p.knot_type,
      multiplier: p.multiplier.toString(),
      description: p.description ?? "",
    });
    setEditingPreset(p);
    setShowPresetForm(true);
  }

  async function handleSubmitPreset(e: React.FormEvent) {
    e.preventDefault();
    if (!presetForm.knot_type.trim() || !presetForm.multiplier) return;

    const payload = {
      knot_type: presetForm.knot_type.trim(),
      multiplier: parseFloat(presetForm.multiplier),
      description: presetForm.description || null,
    };

    if (editingPreset) {
      await supabase.from("cord_presets").update(payload).eq("id", editingPreset.id);
    } else {
      await supabase.from("cord_presets").insert(payload);
    }

    resetPresetForm();
    loadPresets();
  }

  async function handleDeletePreset(id: string) {
    if (!confirm("確定要刪除這個結型嗎？")) return;
    await supabase.from("cord_presets").delete().eq("id", id);
    loadPresets();
  }

  function updateSection(index: number, field: keyof Section, value: string) {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  }

  function getMultiplier(section: Section): number {
    if (section.custom_multiplier) return parseFloat(section.custom_multiplier) || 0;
    const preset = presets.find((p) => p.knot_type === section.knot_type);
    return preset?.multiplier ?? 0;
  }

  function getSectionResult(section: Section) {
    const multiplier = getMultiplier(section);
    const length = parseFloat(section.length_cm) || 0;
    const cordCount = parseInt(section.cord_count) || 1;
    const perCord = length * multiplier;
    const total = perCord * cordCount;
    return { multiplier, perCord, total, cordCount };
  }

  // Grand totals
  const sectionResults = sections.map(getSectionResult);
  const grandTotalPerCord = sectionResults.reduce((sum, r) => sum + r.perCord, 0);
  const grandTotal = sectionResults.reduce((sum, r) => sum + r.total, 0);
  const totalFinishedLength = sections.reduce((sum, s) => sum + (parseFloat(s.length_cm) || 0), 0);

  function formatLength(cm: number) {
    if (cm >= 100) return `${cm.toFixed(1)} cm (${(cm / 100).toFixed(2)} m)`;
    return `${cm.toFixed(1)} cm`;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">繩長計算機</h1>
        <p className="text-muted mt-2">
          一條作品可由多種繩結組成，分段計算後加總所需繩長
        </p>
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
          const result = sectionResults[i];
          const preset = presets.find((p) => p.knot_type === section.knot_type);

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

              {/* Knot type selection */}
              <div>
                <label className="block text-xs text-muted mb-1">結型</label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateSection(i, "knot_type", p.knot_type)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        section.knot_type === p.knot_type
                          ? "bg-primary text-white"
                          : "bg-card border border-border hover:bg-border"
                      }`}
                    >
                      {p.knot_type} (x{p.multiplier})
                    </button>
                  ))}
                </div>
                {preset?.description && (
                  <p className="text-xs text-muted mt-1">{preset.description}</p>
                )}
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">成品長度 (cm)</label>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={section.length_cm}
                    onChange={(e) => updateSection(i, "length_cm", e.target.value)}
                    placeholder="例: 10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">繩數</label>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={section.cord_count}
                    onChange={(e) => updateSection(i, "cord_count", e.target.value)}
                    placeholder="1"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">自訂倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={section.custom_multiplier}
                    onChange={(e) => updateSection(i, "custom_multiplier", e.target.value)}
                    placeholder={`預設 ${preset?.multiplier ?? "—"}`}
                  />
                </div>
              </div>

              {/* Section result */}
              {result.perCord > 0 && (
                <div className="flex gap-4 text-sm pt-1">
                  <span className="text-muted">倍率 x{result.multiplier}</span>
                  <span>每條 <strong className="text-primary">{result.perCord.toFixed(1)} cm</strong></span>
                  <span>小計 <strong className="text-accent">{result.total.toFixed(1)} cm</strong></span>
                </div>
              )}
            </div>
          );
        })}

        {/* Grand total */}
        <div className="bg-background rounded-xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted mb-1">作品總成品長度</p>
            <p className="text-lg font-semibold">{formatLength(totalFinishedLength)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted">每條繩所需總長</p>
              <p className="text-3xl font-bold text-primary">
                {grandTotalPerCord.toFixed(1)} <span className="text-base">cm</span>
              </p>
              {grandTotalPerCord >= 100 && (
                <p className="text-sm text-muted">= {(grandTotalPerCord / 100).toFixed(2)} m</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted">所有繩子總長</p>
              <p className="text-3xl font-bold text-accent">
                {grandTotal.toFixed(1)} <span className="text-base">cm</span>
              </p>
              {grandTotal >= 100 && (
                <p className="text-sm text-muted">= {(grandTotal / 100).toFixed(2)} m</p>
              )}
            </div>
          </div>
        </div>

        {/* Section breakdown table */}
        {sections.filter((s) => s.knot_type && s.length_cm).length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">段落明細</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left py-1.5">段落</th>
                  <th className="text-left py-1.5">結型</th>
                  <th className="text-right py-1.5">長度</th>
                  <th className="text-right py-1.5">倍率</th>
                  <th className="text-right py-1.5">繩數</th>
                  <th className="text-right py-1.5">小計</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s, i) => {
                  const r = sectionResults[i];
                  if (!s.knot_type || !s.length_cm) return null;
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-1.5">{i + 1}</td>
                      <td className="py-1.5">{s.knot_type}</td>
                      <td className="text-right py-1.5">{s.length_cm} cm</td>
                      <td className="text-right py-1.5">x{r.multiplier}</td>
                      <td className="text-right py-1.5">{r.cordCount}</td>
                      <td className="text-right py-1.5 font-medium">{r.total.toFixed(1)} cm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted text-center">
          提示：實際用量可能因個人手勁、結的鬆緊、線材粗細而有差異，建議多預留 10-15%
        </p>
      </div>

      {/* Reference Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">繩長倍率參考表</h2>
          <button
            onClick={() => {
              resetPresetForm();
              setShowPresetForm(true);
            }}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
          >
            + 新增結型
          </button>
        </div>

        {showPresetForm && (
          <form onSubmit={handleSubmitPreset} className="border border-border rounded-lg p-4 mb-4 space-y-3 bg-background">
            <h3 className="text-sm font-medium">{editingPreset ? "編輯結型" : "新增結型"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">結型名稱 *</label>
                <input
                  required
                  className={INPUT_CLASS}
                  value={presetForm.knot_type}
                  onChange={(e) => setPresetForm({ ...presetForm, knot_type: e.target.value })}
                  placeholder="例：平結"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">倍率 *</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  className={INPUT_CLASS}
                  value={presetForm.multiplier}
                  onChange={(e) => setPresetForm({ ...presetForm, multiplier: e.target.value })}
                  placeholder="例：4.0"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">說明</label>
                <input
                  className={INPUT_CLASS}
                  value={presetForm.description}
                  onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                  placeholder="例：成品長度 x 4"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary text-white px-4 py-1 rounded-lg text-sm hover:bg-accent">
                {editingPreset ? "更新" : "新增"}
              </button>
              <button type="button" onClick={resetPresetForm} className="text-muted text-sm">
                取消
              </button>
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">結型</th>
              <th className="text-right py-2">倍率</th>
              <th className="text-left py-2 pl-4">說明</th>
              <th className="text-right py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {presets.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-background/50">
                <td className="py-2 font-medium">{p.knot_type}</td>
                <td className="text-right py-2">x {p.multiplier}</td>
                <td className="py-2 pl-4 text-muted">{p.description}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleEditPreset(p)}
                    className="text-primary hover:text-accent text-xs mr-2"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDeletePreset(p.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
