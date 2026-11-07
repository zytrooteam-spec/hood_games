'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Image from 'next/image';
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldCheck,
  User,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import {
  registerHoodAlertHandlers,
  unregisterHoodAlertHandlers,
} from '@/lib/hoodAlert';

const HoodAlertContext = createContext(null);

const VARIANTS = {
  info: {
    icon: Info,
    iconClass: 'text-sky-400',
    ring: 'border-sky-500/40',
    glow: 'shadow-[0_0_40px_rgba(56,189,248,0.15)]',
    pill: 'VIP DESK NOTICE',
    pillClass: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    btn: 'btn-hood-green',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-[#2cb64e]',
    ring: 'border-[#2cb64e]/50',
    glow: 'shadow-[0_0_45px_rgba(44,182,78,0.25)]',
    pill: 'ACTION COMPLETE',
    pillClass: 'bg-[#2cb64e]/15 border-[#2cb64e]/40 text-[#2cb64e]',
    btn: 'btn-hood-green',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-rose-400',
    ring: 'border-rose-500/45',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.18)]',
    pill: 'ATTENTION REQUIRED',
    pillClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    btn: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    ring: 'border-amber-500/45',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]',
    pill: 'CONFIRM STEP',
    pillClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    btn: 'btn-hood-green',
  },
};

function HoodAlertDialog({ dialog, formValues, setFormValues, onDismiss }) {
  if (!dialog?.open) return null;

  const isConfirm = dialog.mode === 'confirm';
  const isForm = dialog.mode === 'form';
  const v = VARIANTS[dialog.variant] || VARIANTS.info;
  const Icon = v.icon;

  const close = (result) => {
    playTune('click', 0.35);
    onDismiss(result);
  };

  const submitForm = () => {
    if (!dialog.fields?.length) {
      close(null);
      return;
    }
    for (const field of dialog.fields) {
      const val = String(formValues[field.name] ?? '').trim();
      if (field.required && !val) return;
    }
    playTune('click', 0.35);
    const out = {};
    dialog.fields.forEach((field) => {
      out[field.name] = String(formValues[field.name] ?? '').trim();
    });
    onDismiss(out);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hood-alert-title"
      onClick={() => !isConfirm && !isForm && close(true)}
    >
      <div
        className={`relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 ${v.ring} p-6 sm:p-8 ${v.glow} shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 w-48 h-48 bg-[#1a3363]/80 rounded-full blur-2xl" />

        {!isConfirm && !isForm && (
          <button
            type="button"
            onClick={() => close(true)}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/40 transition-all z-10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}
        {isForm && (
          <button
            type="button"
            onClick={() => close(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363] hover:border-[#2cb64e]/40 transition-all z-10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        <div className="relative text-center space-y-3 mb-5">
          <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-[#2cb64e]/40 shadow-[0_0_18px_rgba(44,182,78,0.35)] bg-[#070d1e] flex items-center justify-center p-1.5">
            <Image src="/logo.png" alt="" fill sizes="56px" className="object-contain p-1" />
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${v.pillClass}`}
          >
            {dialog.variant === 'success' ? (
              <Sparkles size={12} className="animate-pulse" />
            ) : (
              <ShieldCheck size={12} />
            )}
            <span>{dialog.pill || v.pill}</span>
          </div>

          <div className={`mx-auto w-12 h-12 rounded-2xl bg-[#070d1e] border border-[#1a3363] flex items-center justify-center ${v.iconClass}`}>
            <Icon size={26} strokeWidth={2.2} />
          </div>

          <h3
            id="hood-alert-title"
            className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight px-2"
          >
            {dialog.title}
          </h3>
        </div>

        {dialog.message ? (
          <p className="relative text-sm text-gray-300 leading-relaxed text-center whitespace-pre-wrap px-1 mb-5">
            {dialog.message}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {isForm && (
          <form
            className="relative space-y-3 mb-6 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              submitForm();
            }}
          >
            {typeof dialog.regenerate === 'function' && (
              <button
                type="button"
                onClick={() => {
                  playTune('click', 0.3);
                  const next = dialog.regenerate(formValues);
                  if (next && typeof next === 'object') {
                    setFormValues((prev) => ({ ...prev, ...next }));
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-[#2cb64e]/35 bg-[#2cb64e]/10 text-[#2cb64e] hover:bg-[#2cb64e]/20 transition-colors"
              >
                <RefreshCw size={14} />
                {dialog.regenerateLabel || 'Generate new values'}
              </button>
            )}

            {dialog.fields.map((field) => {
              const FieldIcon = field.icon === 'lock' ? Lock : field.icon === 'user' ? User : null;
              const regenField =
                typeof field.regenerate === 'function'
                  ? () => {
                      const next = field.regenerate(formValues);
                      if (next != null) {
                        setFormValues((prev) => ({ ...prev, [field.name]: String(next) }));
                      }
                    }
                  : null;
              return (
                <div key={field.name}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-[11px] font-bold text-gray-300">{field.label}</label>
                    {regenField && (
                      <button
                        type="button"
                        onClick={() => {
                          playTune('click', 0.25);
                          regenField();
                        }}
                        className="text-[9px] font-black uppercase tracking-wider text-[#2cb64e] hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw size={10} />
                        New
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    {FieldIcon && (
                      <FieldIcon size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
                    )}
                    <input
                      type={field.type || 'text'}
                      autoComplete="off"
                      value={formValues[field.name] ?? ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }}
                      placeholder={field.placeholder || ''}
                      className={`hood-input w-full py-3 rounded-2xl text-sm font-medium font-mono ${FieldIcon ? 'pl-10 pr-4' : 'px-4'}`}
                      required={Boolean(field.required)}
                    />
                  </div>
                </div>
              );
            })}
          </form>
        )}

        <div
          className={`relative flex gap-3 ${isConfirm || isForm ? 'flex-col-reverse sm:flex-row' : ''}`}
        >
          {(isConfirm || isForm) && (
            <button
              type="button"
              onClick={() => close(isConfirm ? false : null)}
              className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-[#12244c] border border-[#1a3363] text-gray-200 hover:bg-[#1a3363] transition-colors"
            >
              {dialog.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={() => (isForm ? submitForm() : close(true))}
            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_22px_rgba(44,182,78,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] ${v.btn}`}
          >
            {dialog.confirmLabel || 'OK'}
          </button>
        </div>

        <p className="mt-5 text-center text-[10px] font-mono text-gray-500">
          Hood Games VIP Sweeps Hub · Secure session
        </p>
      </div>
    </div>
  );
}

export function useHoodAlert() {
  const ctx = useContext(HoodAlertContext);
  if (!ctx) {
    throw new Error('useHoodAlert must be used within HoodAlertProvider');
  }
  return ctx;
}

export default function HoodAlertProvider({ children }) {
  const [dialog, setDialog] = useState({ open: false });
  const [formValues, setFormValues] = useState({});

  const dismiss = useCallback((result) => {
    setDialog((d) => {
      if (d.resolve) {
        if (d.mode === 'form') d.resolve(result && typeof result === 'object' ? result : null);
        else d.resolve(!!result);
      }
      return { open: false };
    });
    setFormValues({});
  }, []);

  const openAlert = useCallback((opts) => {
    const variant = opts.variant || 'info';
    if (variant === 'success') playTune('win', 0.45);
    else if (variant === 'error') playTune('bell', 0.4);
    else playTune('click', 0.35);

    setDialog({
      open: true,
      mode: 'alert',
      title: opts.title || 'Notice',
      message: opts.message || '',
      variant,
      confirmLabel: opts.confirmLabel,
      pill: opts.pill,
      resolve: null,
    });
  }, []);

  const openConfirm = useCallback((opts) => {
    playTune('click', 0.35);
    return new Promise((resolve) => {
      setDialog({
        open: true,
        mode: 'confirm',
        title: opts.title || 'Confirm action',
        message: opts.message || '',
        variant: opts.variant || 'warning',
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        pill: opts.pill || 'CONFIRM STEP',
        resolve,
      });
    });
  }, []);

  const openForm = useCallback((opts) => {
    playTune('click', 0.35);
    const fields = opts.fields || [];
    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue ?? '';
    });
    setFormValues(initial);
    return new Promise((resolve) => {
      setDialog({
        open: true,
        mode: 'form',
        title: opts.title || 'Enter details',
        message: opts.message || '',
        variant: opts.variant || 'info',
        confirmLabel: opts.confirmLabel || 'Submit',
        cancelLabel: opts.cancelLabel || 'Cancel',
        pill: opts.pill || 'STAFF INPUT',
        fields,
        regenerate: opts.regenerate,
        regenerateLabel: opts.regenerateLabel,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    registerHoodAlertHandlers({ alert: openAlert, confirm: openConfirm, form: openForm });
    return () => unregisterHoodAlertHandlers();
  }, [openAlert, openConfirm, openForm]);

  const value = {
    alert: openAlert,
    confirm: openConfirm,
    success: (message, title) => openAlert({ variant: 'success', title: title || 'Success', message }),
    error: (message, title) => openAlert({ variant: 'error', title: title || 'Something went wrong', message }),
    info: (message, title) => openAlert({ variant: 'info', title: title || 'Heads up', message }),
    warning: (message, title) => openAlert({ variant: 'warning', title: title || 'Please check', message }),
  };

  return (
    <HoodAlertContext.Provider value={value}>
      {children}
      <HoodAlertDialog
        dialog={dialog}
        formValues={formValues}
        setFormValues={setFormValues}
        onDismiss={dismiss}
      />
    </HoodAlertContext.Provider>
  );
}
