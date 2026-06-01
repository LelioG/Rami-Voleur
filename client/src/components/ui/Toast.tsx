import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface ToastProps {
  message?: string | null;
  tone?: "error" | "success" | "info";
}

export function Toast({ message, tone = "info" }: ToastProps) {
  if (!message) return null;
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div className={`ui-toast ui-toast--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
