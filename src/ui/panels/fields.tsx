import { useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange(value: number): void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
}

/** Numeric input that keeps the typed text and only commits finite numbers. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
}: NumberFieldProps) {
  // Raw text while the user is typing; null means "show the committed value".
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value === undefined ? '' : String(value));

  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input">
        <input
          type="number"
          inputMode="decimal"
          value={text}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setDraft(null)}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(value: T): void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
