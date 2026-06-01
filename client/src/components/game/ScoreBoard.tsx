import { PublicGameState } from "@shared";
import { Badge, Panel } from "../ui";

interface ScoreBoardProps {
  state: PublicGameState;
}

export function ScoreBoard({ state }: ScoreBoardProps) {
  const sorted = [...state.players].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

  return (
    <Panel className="score-board" aria-label="Scores de la partie">
      <div className="score-board__header">
        <span className="kicker">Scores</span>
        <strong>Manche {state.roundNumber || 1}</strong>
      </div>
      <div className="score-board__list">
        {sorted.map((player, index) => (
          <div className={`score-row ${player.id === state.currentPlayerId ? "is-active" : ""}`} key={player.id}>
            <span className="score-row__rank">{index + 1}</span>
            <div>
              <strong>{player.name}</strong>
              <span>
                {player.handCount} cartes · {player.hasOpened ? "ouvert" : "fermé"}
              </span>
            </div>
            <Badge tone={index === 0 ? "gold" : "neutral"}>{player.score} pts</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}
