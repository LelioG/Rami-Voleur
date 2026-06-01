import { HTMLAttributes, ReactNode } from "react";

interface CardViewProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
}

export function CardView({ children, interactive = false, selected = false, className = "", ...props }: CardViewProps) {
  return (
    <div
      className={`ui-card-view ${interactive ? "ui-card-view--interactive" : ""} ${
        selected ? "ui-card-view--selected" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
