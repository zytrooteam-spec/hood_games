'use client';

import React from 'react';
import { Crown, Plus, Trash2 } from 'lucide-react';
import { getDefaultVipConfig } from '@/lib/vipConfig';

export default function AdminVipTab({ settings, setSettings }) {
  const vip = settings?.vipConfig || getDefaultVipConfig();
  const tiers = vip.tiers || [];

  const patchVip = (next) => {
    setSettings((prev) => ({
      ...prev,
      vipConfig: { ...vip, ...next },
    }));
  };

  const updateTier = (idx, field, value) => {
    const next = tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    patchVip({ tiers: next });
  };

  const updateTierFeatures = (idx, text) => {
    const features = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updateTier(idx, 'features', features);
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="p-6 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-2">
        <h3 className="text-base font-black text-white flex items-center gap-2 m-0">
          <Crown size={18} className="text-amber-400" />
          VIP Privilege page (player-facing)
        </h3>
        <p className="text-xs text-gray-400 m-0">
          Edit hero copy, tier cards, and benefits. Saved to database — changes appear on{' '}
          <span className="text-cyan-300">/vip</span> immediately.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-3">
        <h4 className="text-sm font-black text-white m-0">Hero section</h4>
        <label className="block text-[10px] font-bold text-gray-400 uppercase">Eyebrow</label>
        <input
          className="hood-input w-full py-2 px-3 rounded-lg text-xs"
          value={vip.heroEyebrow || ''}
          onChange={(e) => patchVip({ heroEyebrow: e.target.value })}
        />
        <label className="block text-[10px] font-bold text-gray-400 uppercase">Headline (plain text)</label>
        <input
          className="hood-input w-full py-2 px-3 rounded-lg text-xs"
          value={vip.heroTitleHtml || ''}
          onChange={(e) => patchVip({ heroTitleHtml: e.target.value })}
        />
        <label className="block text-[10px] font-bold text-gray-400 uppercase">Description</label>
        <textarea
          className="hood-input w-full py-2 px-3 rounded-lg text-xs min-h-[80px]"
          value={vip.heroDescription || ''}
          onChange={(e) => patchVip({ heroDescription: e.target.value })}
        />
        <label className="block text-[10px] font-bold text-gray-400 uppercase">Tiers section subheading</label>
        <input
          className="hood-input w-full py-2 px-3 rounded-lg text-xs"
          value={vip.tiersSubheading || ''}
          onChange={(e) => patchVip({ tiersSubheading: e.target.value })}
        />
      </div>

      <div className="p-5 rounded-2xl bg-[#09142a] border border-[#1a3363] space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-black text-white m-0">Tier cards ({tiers.length})</h4>
          <button
            type="button"
            onClick={() =>
              patchVip({
                tiers: [
                  ...tiers,
                  {
                    id: `tier_${Date.now()}`,
                    name: 'New Tier',
                    badge: 'VIP',
                    color: 'from-[#12244c] to-[#070d1e] border-[#1a3363] text-white',
                    tagColor: 'bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40',
                    turnover: '$0+',
                    cashback: '5%',
                    withdrawalSpeed: 'Standard',
                    popular: false,
                    features: ['Perk line 1'],
                  },
                ],
              })
            }
            className="text-xs font-bold text-[#2cb64e] flex items-center gap-1"
          >
            <Plus size={14} /> Add tier
          </button>
        </div>

        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {tiers.map((tier, idx) => (
            <div key={tier.id || idx} className="p-4 rounded-xl bg-[#070d1e] border border-[#1a3363] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-amber-300">Tier #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => patchVip({ tiers: tiers.filter((_, i) => i !== idx) })}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  title="Remove tier"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Internal id"
                  value={tier.id || ''}
                  onChange={(e) => updateTier(idx, 'id', e.target.value)}
                />
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Display name"
                  value={tier.name || ''}
                  onChange={(e) => updateTier(idx, 'name', e.target.value)}
                />
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Badge label"
                  value={tier.badge || ''}
                  onChange={(e) => updateTier(idx, 'badge', e.target.value)}
                />
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Weekly turnover"
                  value={tier.turnover || ''}
                  onChange={(e) => updateTier(idx, 'turnover', e.target.value)}
                />
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Sunday cashback"
                  value={tier.cashback || ''}
                  onChange={(e) => updateTier(idx, 'cashback', e.target.value)}
                />
                <input
                  className="hood-input py-2 px-2 rounded-lg text-xs"
                  placeholder="Cashout speed"
                  value={tier.withdrawalSpeed || ''}
                  onChange={(e) => updateTier(idx, 'withdrawalSpeed', e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={Boolean(tier.popular)}
                  onChange={(e) => updateTier(idx, 'popular', e.target.checked)}
                />
                Show &quot;Most Popular&quot; ribbon
              </label>
              <label className="text-[10px] font-bold text-gray-400 uppercase block">Perks (one per line)</label>
              <textarea
                className="hood-input w-full py-2 px-2 rounded-lg text-xs min-h-[72px] font-mono"
                value={(tier.features || []).join('\n')}
                onChange={(e) => updateTierFeatures(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => patchVip(getDefaultVipConfig())}
        className="text-xs text-gray-400 hover:text-white underline"
      >
        Reset VIP page to factory defaults
      </button>
    </div>
  );
}
