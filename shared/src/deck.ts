import { Card, DeckIndex, Rank, RANKS, Suit, SUITS } from "./types";

const SUIT_LABELS: Record<Suit, string> = {
  spades: "pique",
  hearts: "coeur",
  diamonds: "carreau",
  clubs: "trefle"
};

const RANK_LABELS: Record<Rank, string> = {
  A: "As",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "Valet",
  Q: "Dame",
  K: "Roi"
};

const ASSET_RANKS: Record<Rank, string> = {
  A: "A",
  "2": "02",
  "3": "03",
  "4": "04",
  "5": "05",
  "6": "06",
  "7": "07",
  "8": "08",
  "9": "09",
  "10": "10",
  J: "J",
  Q: "Q",
  K: "K"
};

export function rankPoints(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

export function cardToAssetPath(card: Pick<Card, "suit" | "rank">): string {
  return `/cards/card_${card.suit}_${ASSET_RANKS[card.rank]}.png`;
}

export function cardBackAssetPath(): string {
  return "/cards/card_back.png";
}

export function createCard(deckIndex: DeckIndex, suit: Suit, rank: Rank): Card {
  return {
    id: `deck${deckIndex}-${suit}-${rank}`,
    deckIndex,
    suit,
    rank,
    label: `${RANK_LABELS[rank]} de ${SUIT_LABELS[suit]}`,
    points: rankPoints(rank),
    assetPath: cardToAssetPath({ suit, rank })
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const deckIndex of [1, 2] as const) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(deckIndex, suit, rank));
      }
    }
  }
  return deck;
}

export function isKnownSuit(value: unknown): value is Suit {
  return typeof value === "string" && (SUITS as readonly string[]).includes(value);
}

export function isKnownRank(value: unknown): value is Rank {
  return typeof value === "string" && (RANKS as readonly string[]).includes(value);
}

export function containsJokerMarker(value: unknown): boolean {
  return typeof value === "string" && /joker/i.test(value);
}

export function assertNoJokerCard(card: Partial<Card>): boolean {
  return !containsJokerMarker(card.id) && !containsJokerMarker(card.label) && !containsJokerMarker(card.assetPath);
}

export function cardIdentity(card: Pick<Card, "suit" | "rank">): string {
  return `${card.suit}-${card.rank}`;
}

export function cardSortValue(card: Card): number {
  const rankIndex = RANKS.indexOf(card.rank);
  const suitIndex = SUITS.indexOf(card.suit);
  return suitIndex * 100 + rankIndex * 2 + card.deckIndex;
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => cardSortValue(a) - cardSortValue(b));
}
