import { cardBackAssetPath } from "@shared";
import { Button } from "../ui";

interface DrawPileProps {
  count: number;
  disabled?: boolean;
  canEndRound?: boolean;
  onDraw: () => void;
}

export function DrawPile({ count, disabled, canEndRound, onDraw }: DrawPileProps) {
  return (
    <div className="draw-pile" aria-label={`Pioche, ${count} cartes restantes`}>
      <button className="draw-pile__card" disabled={disabled} onClick={onDraw} type="button" aria-label="Piocher une carte et passer">
        <img src={cardBackAssetPath()} alt="" draggable={false} />
      </button>
      <div className="draw-pile__meta">
        <strong>{count}</strong>
        <span>{count > 1 ? "cartes dans la pioche" : "carte dans la pioche"}</span>
      </div>
      <Button variant="secondary" size="sm" disabled={disabled} onClick={onDraw}>
        {canEndRound ? "Compter la manche" : "Piocher et passer"}
      </Button>
    </div>
  );
}
