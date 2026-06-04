interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  min?: number;
  step?: number;
}

export function InputField({ label, value, onChange, prefix = '$', min = 0, step = 1 }: InputFieldProps) {
  return (
    <div className="input-field">
      <label className="input-label">{label}</label>
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          min={min}
          step={step}
          className="input-control"
        />
      </div>
    </div>
  );
}
