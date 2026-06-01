import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${fullWidth ? "ui-button--full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="ui-button__spinner" size={18} aria-hidden="true" /> : icon}
      {size !== "icon" && children}
    </button>
  );
}
