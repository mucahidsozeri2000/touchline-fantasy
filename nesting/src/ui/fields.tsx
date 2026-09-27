import { useEffect, useState } from 'react';

/**
 * Sayı alanı: yazarken serbest (ör. "0," ara durumu), odak kaybında veya
 * Enter'da doğrulanıp sınırlanır. Türkçe ondalık virgül kabul edilir.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  integer = false,
  className = '',
  ariaLabel,
  disabled,
  suffix,
}: {
  value: number;
  onChange(v: number): void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value).replace('.', ','));
  useEffect(() => setText(String(value).replace('.', ',')), [value]);

  const commit = () => {
    const n = Number(text.replace(',', '.').trim());
    if (!Number.isFinite(n) || text.trim() === '') {
      setText(String(value).replace('.', ','));
      return;
    }
    let v = Math.min(max, Math.max(min, n));
    if (integer) v = Math.round(v);
    setText(String(v).replace('.', ','));
    if (v !== value) onChange(v);
  };

  return (
    <span className={`inline-flex items-center rounded border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-sky-300 ${className}`}>
      <input
        inputMode={integer ? 'numeric' : 'decimal'}
        aria-label={ariaLabel}
        disabled={disabled}
        className="w-full min-w-0 bg-transparent px-1.5 py-1 text-right text-sm tabular-nums outline-none disabled:text-slate-400"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const v = Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? step : -step)));
            onChange(integer ? Math.round(v) : Math.round(v * 1000) / 1000);
          }
        }}
      />
      {suffix && <span className="pr-1.5 text-xs text-slate-400">{suffix}</span>}
    </span>
  );
}

/** Etiketli satır (ayar paneli). */
export function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="flex items-center gap-2">{children}</span>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
