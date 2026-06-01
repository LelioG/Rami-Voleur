import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({ label, hint, icon, id, className = "", ...props }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label className={`ui-field ${className}`} htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      <span className="ui-field__control">
        {icon && <span className="ui-field__icon">{icon}</span>}
        <input id={inputId} className={icon ? "has-icon" : ""} {...props} />
      </span>
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
