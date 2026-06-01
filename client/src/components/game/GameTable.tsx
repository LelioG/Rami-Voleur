import { Meld, validateTable } from "@shared";
import { MeldGroup } from "./MeldGroup";

interface GameTableProps {
  draftTable: Meld[];
  canEditTable: boolean;
  canEditMeld?: (meld: Meld) => boolean;
  selectedTableIds: Set<string>;
  movedIds: Set<string>;
  selectedCount: number;
  onToggleTableCard: (cardId: string) => void;
  onAddSelectionToMeld: (meldId: string) => void;
}

export function GameTable({
  draftTable,
  canEditTable,
  canEditMeld,
  selectedTableIds,
  movedIds,
  selectedCount,
  onToggleTableCard,
  onAddSelectionToMeld
}: GameTableProps) {
  const tableValidation = validateTable(draftTable);

  return (
    <section className="game-table" aria-label="Table de jeu">
      <div className="game-table__felt">
        {draftTable.length === 0 ? (
          <div className="game-table__empty">
            <strong>Aucune combinaison posée</strong>
            <span>Sélectionnez des cartes de votre main pour créer une combinaison.</span>
          </div>
        ) : (
          <div className="game-table__melds">
            {draftTable.map((meld, index) => (
              <MeldGroup
                key={meld.id}
                meld={meld}
                index={index}
                canEdit={canEditMeld ? canEditMeld(meld) : canEditTable}
                selectedIds={selectedTableIds}
                movedIds={movedIds}
                selectedCount={selectedCount}
                onToggleCard={onToggleTableCard}
                onAddSelection={onAddSelectionToMeld}
              />
            ))}
          </div>
        )}
      </div>
      {!tableValidation.valid && <p className="game-table__error">Le plateau doit rester entièrement valide. {tableValidation.reason}</p>}
    </section>
  );
}
