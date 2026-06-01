import {
  addPlayer,
  Card,
  createDeck,
  createGame,
  GameState,
  Meld,
  startRound,
  TurnPhase
} from "../src";

export function c(rank: Card["rank"], suit: Card["suit"], deckIndex: Card["deckIndex"] = 1): Card {
  const card = createDeck().find((candidate) => candidate.rank === rank && candidate.suit === suit && candidate.deckIndex === deckIndex);
  if (!card) throw new Error(`Missing card ${deckIndex}-${suit}-${rank}`);
  return card;
}

export function meld(id: string, cards: Card[]): Meld {
  return { id, cards };
}

export function makeStartedGame(playerCount = 2): GameState {
  const game = createGame("TEST01", "Alice", playerCount);
  for (let index = 2; index <= playerCount; index += 1) {
    const result = addPlayer(game, `Player ${index}`);
    if (!result.ok) throw new Error(result.error);
    result.value.ready = true;
  }
  game.players[0].ready = true;
  const started = startRound(game);
  if (!started.ok) throw new Error(started.error);
  return game;
}

export function setTurn(game: GameState, playerIndex = 0, phase: TurnPhase = "action_phase"): void {
  game.currentPlayerIndex = playerIndex;
  game.phase = phase;
  game.turnHasPlay = false;
  game.status = "playing";
}

export function allCardIds(game: GameState): string[] {
  return [
    ...game.players.flatMap((player) => player.hand.map((card) => card.id)),
    ...game.table.flatMap((group) => group.cards.map((card) => card.id)),
    ...game.drawPile.map((card) => card.id)
  ];
}
