import { PublicPlayerState } from "@shared";
import { Badge } from "../ui";

interface PlayerSeatProps {
  player: PublicPlayerState;
  active?: boolean;
  self?: boolean;
  empty?: boolean;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export function PlayerSeat({ player, active, self, empty }: PlayerSeatProps) {
  if (empty) {
    return (
      <div className="player-seat player-seat--empty">
        <div className="player-seat__avatar" aria-hidden="true">
          +
        </div>
        <div>
          <strong>Place libre</strong>
          <span>En attente</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`player-seat ${active ? "is-active" : ""} ${self ? "is-self" : ""}`}>
      <div className="player-seat__avatar" aria-hidden="true">
        {initials(player.name)}
      </div>
      <div className="player-seat__content">
        <div className="player-seat__name">
          <strong>{player.name}</strong>
          {self && <Badge tone="gold">Vous</Badge>}
        </div>
        <span>{player.handCount} cartes</span>
      </div>
      <div className="player-seat__badges">
        <Badge tone={player.connected ? "success" : "danger"}>{player.connected ? "Connecté" : "Hors ligne"}</Badge>
        <Badge tone={player.hasOpened ? "gold" : "neutral"}>{player.hasOpened ? "Ouvert" : "Fermé"}</Badge>
      </div>
    </div>
  );
}
