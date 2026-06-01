import { assertNoJokerCard, cardIdentity, isKnownRank, isKnownSuit, rankPoints } from "./deck";
import { Card, Meld, MeldValidation, Rank } from "./types";

const RUN_VALUES: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13
};

export interface TableValidation {
  valid: boolean;
  reason?: string;
  melds: MeldValidation[];
}

export function scoreCards(cards: Card[]): number {
  return cards.reduce((total, card) => total + rankPoints(card.rank), 0);
}

function sortedNumbers(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function areConsecutive(values: number[]): boolean {
  const sorted = sortedNumbers(values);
  return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
}

function runIsConsecutive(cards: Card[]): boolean {
  const rankSet = new Set(cards.map((card) => card.rank));
  if (rankSet.size !== cards.length) return false;

  const ranks = cards.map((card) => card.rank);
  const hasAce = rankSet.has("A");
  if (!hasAce) {
    return areConsecutive(ranks.map((rank) => RUN_VALUES[rank]));
  }

  const lowAceValues = sortedNumbers(ranks.map((rank) => RUN_VALUES[rank]));
  const validLowAceRun = lowAceValues[0] === 1 && areConsecutive(lowAceValues);
  if (validLowAceRun) return true;

  const highAceValues = sortedNumbers(ranks.map((rank) => (rank === "A" ? 14 : RUN_VALUES[rank])));
  const validHighAceRun = highAceValues[highAceValues.length - 1] === 14 && areConsecutive(highAceValues);

  return validHighAceRun;
}

export function validateMeld(cards: Card[]): MeldValidation {
  const points = scoreCards(cards);

  if (cards.length < 3) {
    return { valid: false, points, reason: "Une combinaison doit contenir au moins 3 cartes." };
  }

  for (const card of cards) {
    if (!isKnownSuit(card.suit) || !isKnownRank(card.rank) || !assertNoJokerCard(card)) {
      return { valid: false, points, reason: "Les jokers et cartes inconnues sont interdits." };
    }
  }

  const identitySet = new Set(cards.map(cardIdentity));
  if (identitySet.size !== cards.length) {
    return {
      valid: false,
      points,
      reason: "Deux cartes de meme rang et meme couleur ne peuvent pas etre dans la meme combinaison."
    };
  }

  const sameRank = cards.every((card) => card.rank === cards[0].rank);
  if (sameRank) {
    const suits = new Set(cards.map((card) => card.suit));
    if (suits.size === cards.length && cards.length <= 4) {
      return { valid: true, type: "set", points };
    }
    return { valid: false, points, reason: "Un brelan ou carre doit avoir des couleurs differentes." };
  }

  const sameSuit = cards.every((card) => card.suit === cards[0].suit);
  if (!sameSuit) {
    return { valid: false, points, reason: "Une suite doit etre d'une seule couleur." };
  }

  if (!runIsConsecutive(cards)) {
    return {
      valid: false,
      points,
      reason: "La suite doit etre consecutive, sans rang duplique et sans boucle Roi-As-2."
    };
  }

  return { valid: true, type: "run", points };
}

export function validateTable(table: Meld[]): TableValidation {
  const seenCardIds = new Set<string>();
  const melds: MeldValidation[] = [];

  for (const meld of table) {
    const validation = validateMeld(meld.cards);
    melds.push(validation);
    if (!validation.valid) {
      return { valid: false, reason: validation.reason, melds };
    }

    for (const card of meld.cards) {
      if (seenCardIds.has(card.id)) {
        return { valid: false, reason: `Carte dupliquee sur la table: ${card.label}.`, melds };
      }
      seenCardIds.add(card.id);
    }
  }

  return { valid: true, melds };
}

export function tableCardIds(table: Meld[]): Set<string> {
  const ids = new Set<string>();
  for (const meld of table) {
    for (const card of meld.cards) ids.add(card.id);
  }
  return ids;
}

export function meldPoints(meld: Meld): number {
  return scoreCards(meld.cards);
}

export function totalMeldPoints(melds: Meld[]): number {
  return melds.reduce((total, meld) => total + meldPoints(meld), 0);
}

export function sameCardSet(a: Card[], b: Card[]): boolean {
  if (a.length !== b.length) return false;
  const aIds = new Set(a.map((card) => card.id));
  return b.every((card) => aIds.has(card.id));
}
