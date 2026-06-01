import { ReactNode } from "react";

export type BadgeTone = "neutral" | "gold" | "success" | "warning" | "danger";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`}>{children}</span>;
}
