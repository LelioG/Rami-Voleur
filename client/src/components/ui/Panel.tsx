import { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "table";
}

export function Panel({ children, variant = "default", className = "", ...props }: PanelProps) {
  return (
    <section className={`ui-panel ui-panel--${variant} ${className}`} {...props}>
      {children}
    </section>
  );
}
