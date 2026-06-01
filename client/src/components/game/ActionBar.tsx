import { Plus, RotateCcw, Send, Undo2 } from "lucide-react";
import { Button } from "../ui";

interface ActionBarProps {
  canAct: boolean;
  canEditTable: boolean;
  selectedCount: number;
  selectedTableCount: number;
  draftValid: boolean;
  hasOpened?: boolean;
  turnHasPlay: boolean;
  onCreateMeld: () => void;
  onStealToHand: () => void;
  onReset: () => void;
  onValidate: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  canAct,
  canEditTable,
  selectedCount,
  selectedTableCount,
  draftValid,
  hasOpened,
  turnHasPlay,
  onCreateMeld,
  onStealToHand,
  onReset,
  onValidate,
  onEndTurn
}: ActionBarProps) {
  return (
    <div className="action-bar" aria-label="Actions du tour">
      <Button variant="secondary" disabled={!canAct || selectedCount === 0} onClick={onCreateMeld} icon={<Plus size={18} />}>
        Nouvelle combinaison
      </Button>
      <Button variant="ghost" disabled={!canEditTable || selectedTableCount === 0} onClick={onStealToHand} icon={<Undo2 size={18} />}>
        Reprendre vers ma main
      </Button>
      <Button variant="ghost" onClick={onReset} icon={<RotateCcw size={18} />}>
        Annuler
      </Button>
      <Button variant="primary" disabled={!canAct || !draftValid} onClick={onValidate} icon={<Send size={18} />}>
        {hasOpened ? "Valider le plateau" : "Valider la pose"}
      </Button>
      <Button variant="primary" disabled={!canAct || !turnHasPlay} onClick={onEndTurn}>
        Finir le tour
      </Button>
    </div>
  );
}
