import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="ui-modal__backdrop" onClick={onClose} />
      <div className="ui-modal__panel">
        <header className="ui-modal__header">
          <h2 id="modal-title">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer la fenêtre" icon={<X size={18} />} />
        </header>
        {children}
      </div>
    </div>
  );
}
