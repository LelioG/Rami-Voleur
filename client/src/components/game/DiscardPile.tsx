import { Badge } from "../ui";

export function DiscardPile() {
  return (
    <div className="discard-pile" aria-label="Défausse désactivée">
      <Badge tone="neutral">Sans défausse</Badge>
      <span>Cette variante du Rami voleur ne crée aucune pile de défausse.</span>
    </div>
  );
}
