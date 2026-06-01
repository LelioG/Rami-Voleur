import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function Select({ label, hint, id, children, className = "", ...props }: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label className={`ui-field ${className}`} htmlFor={selectId}>
      <span className="ui-field__label">{label}</span>
      <span className="ui-field__control ui-field__control--select">
        <select id={selectId} {...props}>
          {children}
        </select>
      </span>
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
