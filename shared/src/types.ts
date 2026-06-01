export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export type Rank = (typeof RANKS)[number];

export type DeckIndex = 1 | 2;

export interface Card {
  id: string;
  deckIndex: DeckIndex;
  suit: Suit;
  rank: Rank;
  label: string;
  points: number;
  assetPath: string;
}

export interface Meld {
  id: string;
  cards: Card[];
  ownerId?: string;
}

export type MeldType = "set" | "run";

export interface MeldValidation {
  valid: boolean;
  type?: MeldType;
  points: number;
  reason?: string;
}

export type GameStatus = "lobby" | "dealing" | "playing" | "round_scoring" | "round_finished" | "game_over";
export type TurnPhase = "action_phase";

export interface GameOptions {
  firstMeldMinimum: number;
  unopenedPenalty: number;
  applyUnopenedPenalty: boolean;
  roundsToWin: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  hasOpened: boolean;
  connected: boolean;
  ready: boolean;
}

export interface RoundPenalty {
  playerId: string;
  playerName: string;
  penalty: number;
  totalScore: number;
  remainingCards: number;
  neverOpened: boolean;
}

export interface RoundResult {
  roundNumber: number;
  winnerId: string;
  winnerIds: string[];
  isTie: boolean;
  reason: "empty_hand" | "draw_pile_empty";
  penalties: RoundPenalty[];
}

export interface PublicHistoryEntry {
  at: number;
  message: string;
}

export interface GameState {
  roomCode: string;
  hostId: string;
  maxPlayers: number;
  status: GameStatus;
  options: GameOptions;
  players: PlayerState[];
  roundNumber: number;
  currentPlayerIndex: number;
  phase: TurnPhase;
  turnHasPlay: boolean;
  table: Meld[];
  drawPile: Card[];
  history: PublicHistoryEntry[];
  roundResult?: RoundResult;
  gameWinnerId?: string;
}

export interface PublicPlayerState {
  id: string;
  name: string;
  score: number;
  hasOpened: boolean;
  connected: boolean;
  ready: boolean;
  handCount: number;
  isHost: boolean;
}

export interface PublicGameState {
  roomCode: string;
  status: GameStatus;
  maxPlayers: number;
  options: GameOptions;
  roundNumber: number;
  playerId: string;
  hostId: string;
  hand: Card[];
  players: PublicPlayerState[];
  opponentCardCounts: Record<string, number>;
  table: Meld[];
  drawPileCount: number;
  scores: Record<string, number>;
  currentPlayerId: string | null;
  phase: TurnPhase;
  turnHasPlay: boolean;
  history: PublicHistoryEntry[];
  roundResult?: RoundResult;
  gameWinnerId?: string;
}

export type ActionResult<T = GameState> =
  | { ok: true; value: T }
  | { ok: false; error: string };
