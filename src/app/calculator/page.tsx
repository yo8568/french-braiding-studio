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

export default function CalculatorPage() {
  const supabase = createClient();
  const [presets, setPresets] = useState<CordPreset[]>([]);
  const [selectedKnot, setSelectedKnot] = useState("");
  const [finishedLength, setFinishedLength] = useState("");
  const [cordCount, setCordCount] = useState("1");
  const [customMultiplier, setCustomMultiplier] = useState("");
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
    if (data) {
      setPresets(data);
      if (data.length > 0 && !selectedKnot) {
        setSelectedKnot(data[0].knot_type);
      }
    }
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

  const currentPreset = presets.find((p) => p.knot_type === selectedKnot);
  const multiplier = customMultiplier
    ? parseFloat(customMultiplier)
    : currentPreset?.multiplier ?? 4;
  const length = parseFloat(finishedLength) || 0;
  const count = parseInt(cordCount) || 1;
  const totalPerCord = length * multiplier;
  const totalAll = totalPerCord * count;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">繩長計算機</h1>
        <p className="text-muted mt-2">
          根據結型和成品長度，計算所需的繩長
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Knot Type */}
        <div>
          <label className="block text-sm font-medium mb-2">結型</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedKnot(p.knot_type);
                  setCustomMultiplier("");
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedKnot === p.knot_type
                    ? "bg-primary text-white"
                    : "bg-background border border-border hover:bg-border"
                }`}
              >
                {p.knot_type}
              </button>
            ))}
          </div>
          {currentPreset && (
            <p className="text-sm text-muted mt-2">
              {currentPreset.description}
            </p>
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              成品長度 (cm)
            </label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={finishedLength}
              onChange={(e) => setFinishedLength(e.target.value)}
              placeholder="例: 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">繩子數量</label>
            <input
              type="number"
              className={INPUT_CLASS}
              value={cordCount}
              onChange={(e) => setCordCount(e.target.value)}
              placeholder="1"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              自訂倍率
            </label>
            <input
              type="number"
              step="0.1"
              className={INPUT_CLASS}
              value={customMultiplier}
              onChange={(e) => setCustomMultiplier(e.target.value)}
              placeholder={`預設 ${currentPreset?.multiplier ?? 4}`}
            />
          </div>
        </div>

        {/* Result */}
        <div className="bg-background rounded-xl p-6 text-center space-y-4">
          <div>
            <p className="text-sm text-muted">倍率</p>
            <p className="text-2xl font-bold text-primary">x {multiplier}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">每條繩所需長度</p>
              <p className="text-3xl font-bold text-primary">
                {totalPerCord.toFixed(1)}{" "}
                <span className="text-base">cm</span>
              </p>
              {totalPerCord >= 100 && (
                <p className="text-sm text-muted">
                  = {(totalPerCord / 100).toFixed(2)} m
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted">總共所需繩長</p>
              <p className="text-3xl font-bold text-accent">
                {totalAll.toFixed(1)} <span className="text-base">cm</span>
              </p>
              {totalAll >= 100 && (
                <p className="text-sm text-muted">
                  = {(totalAll / 100).toFixed(2)} m
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted text-center">
          提示：實際用量可能因個人手勁、結的鬆緊、線材粗細而有差異，建議多預留
          10-15%
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

        {/* Preset form */}
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
