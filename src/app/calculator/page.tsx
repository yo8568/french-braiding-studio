"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface CordPreset {
  id: string;
  knot_type: string;
  multiplier: number;
  description: string;
}

export default function CalculatorPage() {
  const [presets, setPresets] = useState<CordPreset[]>([]);
  const [selectedKnot, setSelectedKnot] = useState("");
  const [finishedLength, setFinishedLength] = useState("");
  const [cordCount, setCordCount] = useState("1");
  const [customMultiplier, setCustomMultiplier] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("cord_presets")
      .select("*")
      .order("knot_type")
      .then(({ data }) => {
        if (data) {
          setPresets(data);
          if (data.length > 0) {
            setSelectedKnot(data[0].knot_type);
          }
        }
      });
  }, []);

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
              className="w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={finishedLength}
              onChange={(e) => setFinishedLength(e.target.value)}
              placeholder="例: 20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">繩子數量</label>
            <input
              type="number"
              className="w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="w-full border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        <h2 className="text-xl font-semibold text-primary mb-4">
          繩長倍率參考表
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">結型</th>
              <th className="text-right py-2">倍率</th>
              <th className="text-left py-2 pl-4">說明</th>
            </tr>
          </thead>
          <tbody>
            {presets.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-2 font-medium">{p.knot_type}</td>
                <td className="text-right py-2">x {p.multiplier}</td>
                <td className="py-2 pl-4 text-muted">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
