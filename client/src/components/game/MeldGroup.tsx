import { Card, Meld, validateMeld } from "@shared";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { Badge, Button } from "../ui";
import { PlayingCard } from "./PlayingCard";

interface MeldGroupProps {
  meld: Meld;
  index: number;
  canEdit: boolean;
  selectedIds: Set<string>;
  movedIds: Set<string>;
  selectedCount: number;
  onToggleCard: (cardId: string) => void;
  onAddSelection: (meldId: string) => void;
}

export function MeldGroup({
  meld,
  index,
  canEdit,
  selectedIds,
  movedIds,
  selectedCount,
  onToggleCard,
  onAddSelection
}: MeldGroupProps) {
  const validation = validateMeld(meld.cards);

  return (
    <article className={`meld-group ${validation.valid ? "is-valid" : "is-invalid"}`}>
      <header className="meld-group__header">
        <div>
          <span className="kicker">Combinaison {index + 1}</span>
          <strong>{validation.type === "set" ? "Brelan / carré" : validation.type === "run" ? "Suite" : "À corriger"}</strong>
        </div>
        <Badge tone={validation.valid ? "success" : "danger"}>
          {validation.valid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {validation.valid ? "Valide" : "Invalide"}
        </Badge>
      </header>
      <div className="meld-group__cards">
        {meld.cards.map((card: Card) => (
          <PlayingCard
            card={card}
            compact
            key={card.id}
            moved={movedIds.has(card.id)}
            selected={selectedIds.has(card.id)}
            disabled={!canEdit}
            onClick={canEdit ? () => onToggleCard(card.id) : undefined}
          />
        ))}
      </div>
      {!validation.valid && <p className="meld-group__error">{validation.reason ?? "Cette combinaison n’est pas valide."}</p>}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canEdit || selectedCount === 0}
        onClick={() => onAddSelection(meld.id)}
        icon={<Plus size={16} />}
      >
        Ajouter ici
      </Button>
    </article>
  );
}
