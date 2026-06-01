import { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "center";
}

export function SectionHeader({ eyebrow, title, description, action, align = "start" }: SectionHeaderProps) {
  return (
    <header className={`ui-section-header ui-section-header--${align}`}>
      <div>
        {eyebrow && <span className="kicker">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
