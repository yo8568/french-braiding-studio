"use client";

import { useState } from "react";
import { usePageShow } from "@/lib/usePageShow";
import { createClient } from "@/lib/supabase";
import { INPUT_CLASS } from "@/lib/constants";
import type { Thread, Technique } from "@/lib/types";

interface Section {
  technique_id: string;
  cordCount: 2 | 3;
  length_cm: string;
  repeat: string;
  cord1_mult: string;
  cord2_mult: string;
  cord3_mult: string;
  threadMapping: [string, string, string];
}

const EMPTY_SECTION: Section = {
  technique_id: "",
  cordCount: 3,
  length_cm: "",
  repeat: "1",
  cord1_mult: "",
  cord2_mult: "",
  cord3_mult: "",
  threadMapping: ["0", "1", "2"],
};

export default function CalculatorPage() {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [sections, setSections] = useState<Section[]>([{ ...EMPTY_SECTION }]);
  const [selectedThreadIds, setSelectedThreadIds] = useState(["", "", ""]);

  usePageShow(() => {
    loadAll();
  });

  async function loadAll() {
    const [t, tech] = await Promise.all([
      supabase.from("threads").select("*").order("color_name"),
      supabase.from("techniques").select("*").order("name"),
    ]);
    if (t.data) setThreads(t.data);
    if (tech.data) setTechniques(tech.data);
  }

  function handleSectionCordCount(i: number, count: 2 | 3) {
    const updated = [...sections];
    updated[i] = {
      ...updated[i],
      cordCount: count,
      threadMapping: count === 2 ? ["0", "1", "0"] : ["0", "1", "2"],
    };
    setSections(updated);
  }

  function getThreadLabel(globalIdx: number): string {
    const threadId = selectedThreadIds[globalIdx];
    const thread = threads.find((t) => t.id === threadId);
    return thread ? `${thread.color_name}${thread.material ? ` (${thread.material})` : ""}` : `線${globalIdx + 1}`;
  }

  function updateSection(i: number, field: keyof Section, value: string) {
    const updated = [...sections];
    updated[i] = { ...updated[i], [field]: value };
    setSections(updated);
  }

  function updateThreadMapping(sectionIdx: number, cordPos: number, globalIdx: string) {
    const updated = [...sections];
    const mapping = [...updated[sectionIdx].threadMapping] as [string, string, string];
    mapping[cordPos] = globalIdx;
    updated[sectionIdx] = { ...updated[sectionIdx], threadMapping: mapping };
    setSections(updated);
  }

  function handleSelectTechnique(i: number, techniqueId: string) {
    const tech = techniques.find((t) => t.id === techniqueId);
    const updated = [...sections];
    updated[i] = {
      ...updated[i],
      technique_id: techniqueId,
      cord1_mult: tech?.cord1_multiplier?.toString() ?? "",
      cord2_mult: tech?.cord2_multiplier?.toString() ?? "",
      cord3_mult: tech?.cord3_multiplier?.toString() ?? "",
    };
    setSections(updated);
  }

  function getCordLengths(s: Section) {
    const len = parseFloat(s.length_cm) || 0;
    const repeat = parseInt(s.repeat) || 1;
    return [
      len * (parseFloat(s.cord1_mult) || 0) * repeat,
      len * (parseFloat(s.cord2_mult) || 0) * repeat,
      len * (parseFloat(s.cord3_mult) || 0) * repeat,
    ];
  }

  // Totals per global thread (always 3)
  const cordTotals = [0, 0, 0];
  let totalFinished = 0;
  for (const s of sections) {
    const lengths = getCordLengths(s);
    for (let ci = 0; ci < s.cordCount; ci++) {
      const globalIdx = parseInt(s.threadMapping[ci]);
      if (globalIdx >= 0 && globalIdx < 3) {
        cordTotals[globalIdx] += lengths[ci];
      }
    }
    totalFinished += (parseFloat(s.length_cm) || 0) * (parseInt(s.repeat) || 1);
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
          選擇線數與線材，設定多段編法計算所需繩長
        </p>
      </div>

      {/* Thread selection (always 3) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium mb-2">選擇線材</p>
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

              {/* Cord count for this section */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">線數：</span>
                {([2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleSectionCordCount(i, n)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      section.cordCount === n
                        ? "bg-primary text-white"
                        : "bg-card border border-border hover:bg-border"
                    }`}
                  >
                    {n} 條線
                  </button>
                ))}
              </div>

              {/* Technique selection */}
              <div>
                <label className="block text-xs text-muted mb-1">編法</label>
                <div className="flex flex-wrap gap-1.5">
                  {techniques.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTechnique(i, t.id)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        section.technique_id === t.id
                          ? "bg-primary text-white"
                          : "bg-card border border-border hover:bg-border"
                      }`}
                    >
                      {t.name}
                      {(t.cord1_multiplier || t.cord2_multiplier || t.cord3_multiplier) && (
                        <span className="opacity-70 ml-0.5">
                          ({t.cord1_multiplier ?? 0}/{t.cord2_multiplier ?? 0}{section.cordCount === 3 ? `/${t.cord3_multiplier ?? 0}` : ""})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread mapping */}
              <div>
                <label className="block text-xs text-muted mb-1">線材對應</label>
                <div className={`grid gap-2 ${section.cordCount === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {Array.from({ length: section.cordCount }).map((_, ci) => (
                    <div key={ci} className="flex items-center gap-1">
                      <span className="text-xs text-muted shrink-0">位置{ci + 1}:</span>
                      <select
                        className="flex-1 border border-border rounded px-2 py-1 text-xs bg-card"
                        value={section.threadMapping[ci]}
                        onChange={(e) => updateThreadMapping(i, ci, e.target.value)}
                      >
                        {[0, 1, 2].map((gi) => (
                          <option key={gi} value={gi.toString()}>
                            {getThreadLabel(gi)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Length + repeat + per-cord multipliers */}
              <div className={`grid gap-2 ${section.cordCount === 2 ? "grid-cols-4" : "grid-cols-5"}`}>
                <div>
                  <label className="block text-xs text-muted mb-1">單個完成長度 (cm)</label>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={section.length_cm}
                    onChange={(e) => updateSection(i, "length_cm", e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">重複次數</label>
                  <input
                    type="number"
                    min="1"
                    className={INPUT_CLASS}
                    value={section.repeat}
                    onChange={(e) => updateSection(i, "repeat", e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">位置1 倍率</label>
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
                  <label className="block text-xs text-muted mb-1">位置2 倍率</label>
                  <input
                    type="number"
                    step="0.1"
                    className={INPUT_CLASS}
                    value={section.cord2_mult}
                    onChange={(e) => updateSection(i, "cord2_mult", e.target.value)}
                    placeholder="0"
                  />
                </div>
                {section.cordCount === 3 && (
                  <div>
                    <label className="block text-xs text-muted mb-1">位置3 倍率</label>
                    <input
                      type="number"
                      step="0.1"
                      className={INPUT_CLASS}
                      value={section.cord3_mult}
                      onChange={(e) => updateSection(i, "cord3_mult", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Section result */}
              {cordLengths.slice(0, section.cordCount).some((l) => l > 0) && (
                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  {cordLengths.slice(0, section.cordCount).map((len, ci) => (
                    <span key={ci}>
                      位置{ci + 1}({getThreadLabel(parseInt(section.threadMapping[ci]))}): <strong className="text-primary">{len.toFixed(1)} cm</strong>
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
                <p className="text-sm text-muted">{getThreadLabel(i)}</p>
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
            <p className="text-sm text-muted">全部線材總計</p>
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
    </div>
  );
}
