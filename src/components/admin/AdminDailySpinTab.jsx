'use client';

import React from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { getDefaultWheelConfig } from '@/lib/wheelConfig';

export default function AdminDailySpinTab({ settings, setSettings }) {
  const wheel = settings?.wheelConfig || getDefaultWheelConfig();
  const slices = wheel.slices || [];
  const odds = wheel.odds || [];

  const patchWheel = (next) => {
    setSettings((prev) => ({
      ...prev,
      wheelConfig: { ...wheel, ...next },
    }));
  };

  const oddsTotal = odds.reduce((s, o) => s + Math.max(0, Number(o.percent || 0)), 0);

  return (
    <div className="space-y-6 pt-4">
      <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-2">
        <h3 className="text-base font-black text-white flex items-center gap-2 m-0">
          <Sparkles size={18} className="text-[#2cb64e]" />
          Depositor free spin wheel
        </h3>
        <p className="text-xs text-gray-400 m-0">
          Slice labels appear on the player wheel. Odds percentages control win chance (should total 100%).
          Saved to database — live spins use these values immediately.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-3">
        <h4 className="text-sm font-black text-white m-0">Wheel segments ({slices.length})</h4>
        <p className="text-[10px] text-gray-400 m-0">
          <span className="text-cyan-300 font-bold">Wheel text</span> = any words ($1, Bad Luck, Try Again).{' '}
          <span className="text-amber-300 font-bold">SC credit</span> = numbers only (0 when no payout).
        </p>
        <div className="hidden sm:grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-gray-500 px-1">
          <span className="col-span-1">#</span>
          <span className="col-span-4">Wheel text</span>
          <span className="col-span-2">SC credit</span>
          <span className="col-span-3">No prize</span>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {slices.map((sl, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
              <span className="col-span-1 font-mono text-gray-500">#{idx + 1}</span>
              <input
                type="text"
                inputMode="text"
                className="hood-input col-span-4 py-2 px-2 rounded-lg font-bold"
                value={sl.label ?? ''}
                onChange={(e) => {
                  const next = slices.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s));
                  patchWheel({ slices: next });
                }}
                placeholder="e.g. Bad Luck, Try Again, $2"
              />
              <input
                type="number"
                step="0.01"
                className="hood-input col-span-2 py-2 px-2 rounded-lg font-mono"
                value={sl.isBadLuck ? 0 : sl.value ?? 0}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === '' ? 0 : Number(raw);
                  const next = slices.map((s, i) =>
                    i === idx
                      ? {
                          ...s,
                          value: Number.isFinite(val) ? val : 0,
                          isBadLuck: s.isBadLuck || val <= 0,
                        }
                      : s
                  );
                  patchWheel({ slices: next });
                }}
                title="SC credited on win (0 = no SC)"
                disabled={Boolean(sl.isBadLuck)}
              />
              <label className="col-span-3 flex items-center gap-1 text-gray-400">
                <input
                  type="checkbox"
                  checked={Boolean(sl.isBadLuck)}
                  onChange={(e) => {
                    const next = slices.map((s, i) =>
                      i === idx ? { ...s, isBadLuck: e.target.checked } : s
                    );
                    patchWheel({ slices: next });
                  }}
                />
                Bad luck
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black text-white m-0">Win probabilities</h4>
          <span
            className={`text-[10px] font-black px-2 py-1 rounded-lg ${
              Math.abs(oddsTotal - 100) < 0.5
                ? 'bg-[#2cb64e]/20 text-[#7ee08f]'
                : 'bg-amber-500/20 text-amber-200'
            }`}
          >
            Total: {oddsTotal.toFixed(1)}%
          </span>
        </div>
        {odds.map((o, idx) => (
          <div key={o.id || idx} className="grid grid-cols-12 gap-2 items-end">
            <input
              className="hood-input col-span-4 py-2 px-2 rounded-lg text-xs"
              value={o.label || ''}
              onChange={(e) => {
                const next = odds.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row));
                patchWheel({ odds: next });
              }}
            />
            <div className="col-span-3">
              <label className="text-[9px] text-gray-500 uppercase font-bold">Chance %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="hood-input w-full py-2 px-2 rounded-lg font-mono text-xs"
                value={o.percent ?? 0}
                onChange={(e) => {
                  const next = odds.map((row, i) =>
                    i === idx ? { ...row, percent: Number(e.target.value) } : row
                  );
                  patchWheel({ odds: next });
                }}
              />
            </div>
            <input
              className="hood-input col-span-4 py-2 px-2 rounded-lg font-mono text-xs"
              value={(o.sliceIndexes || []).join(',')}
              onChange={(e) => {
                const sliceIndexes = e.target.value
                  .split(',')
                  .map((x) => Number(x.trim()))
                  .filter((n) => !Number.isNaN(n));
                const next = odds.map((row, i) => (i === idx ? { ...row, sliceIndexes } : row));
                patchWheel({ odds: next });
              }}
              placeholder="Slice indexes e.g. 0,4,7"
            />
            <button
              type="button"
              onClick={() => patchWheel({ odds: odds.filter((_, i) => i !== idx) })}
              className="col-span-1 p-2 rounded-lg text-rose-400 hover:bg-rose-500/10"
              title="Remove tier"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            patchWheel({
              odds: [
                ...odds,
                {
                  id: `tier_${Date.now()}`,
                  label: 'New tier',
                  value: 1,
                  percent: 0,
                  sliceIndexes: [0],
                  isBadLuck: false,
                },
              ],
            })
          }
          className="text-xs font-bold text-[#2cb64e] flex items-center gap-1"
        >
          <Plus size={14} /> Add probability tier
        </button>
      </div>

      <button
        type="button"
        onClick={() => patchWheel(getDefaultWheelConfig())}
        className="text-xs text-gray-400 hover:text-white underline"
      >
        Reset wheel to factory defaults (code defaults)
      </button>
    </div>
  );
}
