'use client';

import React from 'react';
import { X } from 'lucide-react';

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const VARIANT_CLASS = {
  default: 'hood-modal-card--default',
  danger: 'hood-modal-card--danger',
  neutral: 'hood-modal-card--neutral',
};

/**
 * Unified Hood admin modal shell — consistent overlay, spacing, typography.
 */
export function HoodAdminModal({
  open,
  onClose,
  children,
  size = 'md',
  variant = 'default',
  closeOnOverlay = true,
  zIndex = 999999,
  className = '',
}) {
  if (!open) return null;

  return (
    <div
      className="hood-modal-overlay"
      style={{ zIndex }}
      onClick={closeOnOverlay && onClose ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`hood-modal-card modal-scrollable w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} ${VARIANT_CLASS[variant] || VARIANT_CLASS.default} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function HoodAdminModalHeader({ icon, title, subtitle, onClose, iconClassName = '' }) {
  return (
    <header className="hood-modal-header">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon ? <div className={`hood-modal-icon ${iconClassName}`}>{icon}</div> : null}
        <div className="min-w-0">
          <h3 className="hood-modal-title">{title}</h3>
          {subtitle ? <p className="hood-modal-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {onClose ? (
        <button type="button" onClick={onClose} className="hood-modal-close" aria-label="Close">
          <X size={18} />
        </button>
      ) : null}
    </header>
  );
}

export function HoodAdminModalBody({ children, className = '' }) {
  return <div className={`hood-modal-body space-y-4 ${className}`}>{children}</div>;
}

export function HoodAdminModalSummary({ children, className = '' }) {
  return <div className={`hood-modal-summary space-y-2 ${className}`}>{children}</div>;
}

export function HoodAdminModalSummaryRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex justify-between items-center gap-4 text-xs sm:text-[13px]">
      <span className="text-gray-400 shrink-0">{label}</span>
      <strong className={`text-white font-bold text-right truncate ${valueClassName}`}>{value}</strong>
    </div>
  );
}

export function HoodAdminModalField({ label, hint, required, children, tone = 'default' }) {
  const labelTone = tone === 'danger' ? 'text-rose-300' : tone === 'accent' ? 'text-[#7ee08f]' : 'text-gray-300';
  return (
    <div className="hood-modal-field">
      {label ? (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className={`block text-[11px] font-black uppercase tracking-wider ${labelTone}`}>
            {label}
            {required ? <span className="text-rose-400 ml-0.5">*</span> : null}
          </label>
          {hint ? <span className="text-[10px] text-gray-500 text-right">{hint}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function HoodAdminModalHint({ children }) {
  return <p className="text-[10.5px] text-gray-500 mt-1.5 leading-relaxed m-0">{children}</p>;
}

export function HoodAdminModalActions({ children, className = '' }) {
  return <footer className={`hood-modal-actions ${className}`}>{children}</footer>;
}

export function HoodAdminModalButton({
  type = 'button',
  variant = 'ghost',
  className = '',
  children,
  ...rest
}) {
  const base =
    'py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wide inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    ghost: 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent',
    primary: 'btn-hood-green border-0 shadow-[0_0_20px_rgba(44,182,78,0.35)] hover:scale-[1.02] active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border-0 shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:scale-[1.02] active:scale-[0.98]',
    secondary: 'bg-[#070d1e] text-gray-300 border border-[#1a3363] hover:text-white hover:border-[#2cb64e]/40',
  };
  return (
    <button type={type} className={`${base} ${variants[variant] || variants.ghost} ${className}`} {...rest}>
      {children}
    </button>
  );
}
