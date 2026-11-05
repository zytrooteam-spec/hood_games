'use client';

import React, { useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { compressImageFile } from '@/lib/imageCompress';

const inputCls = 'hood-input w-full px-3 py-2.5 rounded-xl text-xs font-semibold';

export default function AdminImageField({
  label,
  value = '',
  onChange,
  hint,
  maxSize = 900,
  quality = 0.65,
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageFile(file, {
        maxSize,
        quality,
        maxChars: 180000,
      });
      onChange(dataUrl);
    } catch (err) {
      alert(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-300 block">{label}</label>
      {hint ? <p className="text-[10px] text-gray-500 -mt-1">{hint}</p> : null}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/example.jpg or paste URL"
          className={`${inputCls} flex-1`}
        />
        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0e2042] border border-[#1a3363] hover:border-[#2cb64e]/50 text-xs font-black text-[#2cb64e] cursor-pointer shrink-0 transition-colors">
          {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
          <span>{uploading ? 'Processing…' : 'Upload Image'}</span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      </div>
      {value ? (
        <div className="relative w-full max-w-[200px] h-24 rounded-xl overflow-hidden border border-[#1a3363] bg-[#070d1e]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}
