import { Card } from "@shared";
import { DragEventHandler } from "react";

interface PlayingCardProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  playable?: boolean;
  moved?: boolean;
  dragging?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: DragEventHandler<HTMLButtonElement>;
  onDragOver?: DragEventHandler<HTMLButtonElement>;
  onDrop?: DragEventHandler<HTMLButtonElement>;
  onDragEnd?: DragEventHandler<HTMLButtonElement>;
}

export function PlayingCard({
  card,
  selected,
  disabled,
  compact,
  playable,
  moved,
  dragging,
  draggable,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: PlayingCardProps) {
  return (
    <button
      type="button"
      className={`playing-card ${compact ? "playing-card--compact" : ""} ${selected ? "is-selected" : ""} ${
        playable ? "is-playable" : ""
      } ${moved ? "is-moved" : ""} ${draggable ? "is-draggable" : ""} ${dragging ? "is-dragging" : ""}`}
      disabled={disabled}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-pressed={selected}
      aria-label={`${card.label}, ${card.points} points${selected ? ", sélectionnée" : ""}${
        draggable ? ", déplaçable dans votre main" : ""
      }`}
      title={`${card.label} (${card.points} pts)`}
    >
      <img src={card.assetPath} alt="" draggable={false} />
    </button>
  );
}
