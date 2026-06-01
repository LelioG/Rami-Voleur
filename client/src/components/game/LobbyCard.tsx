import { PublicPlayerState } from "@shared";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Badge, CardView } from "../ui";

interface LobbyCardProps {
  player?: PublicPlayerState;
  self?: boolean;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export function LobbyCard({ player, self }: LobbyCardProps) {
  if (!player) {
    return (
      <CardView className="lobby-card lobby-card--empty">
        <div className="lobby-card__avatar">+</div>
        <div>
          <strong>Place libre</strong>
          <span>En attente d’un joueur</span>
        </div>
        <Badge tone="neutral">Libre</Badge>
      </CardView>
    );
  }

  return (
    <CardView className="lobby-card">
      <div className="lobby-card__avatar">{initials(player.name)}</div>
      <div>
        <strong>{player.name}</strong>
        <span>{player.isHost ? "Hôte du salon" : "Joueur invité"}</span>
      </div>
      <Badge tone={player.ready ? "success" : "warning"}>
        {player.ready ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
        {player.ready ? "Prêt" : "Pas prêt"}
      </Badge>
      {self && <Badge tone="gold">Vous</Badge>}
    </CardView>
  );
}
