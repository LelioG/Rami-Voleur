import { createDeck, sortCards } from "./deck";
import { scoreCards, sameCardSet, tableCardIds, totalMeldPoints, validateTable } from "./rules";
import {
  ActionResult,
  Card,
  GameOptions,
  GameState,
  Meld,
  PlayerState,
  PublicGameState,
  RoundPenalty
} from "./types";

export const DEFAULT_OPTIONS: GameOptions = {
  firstMeldMinimum: 40,
  unopenedPenalty: 100,
  applyUnopenedPenalty: true,
  roundsToWin: 5
};

function ok<T>(value: T): ActionResult<T> {
  return { ok: true, value };
}

function fail<T = GameState>(error: string): ActionResult<T> {
  return { ok: false, error };
}

export function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateRoomCode(existingCodes: Iterable<string> = []): string {
  const existing = new Set(existingCodes);
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (existing.has(code));
  return code;
}

export function createPlayer(name: string): PlayerState {
  return {
    id: randomId("player"),
    name: name.trim().slice(0, 24) || "Joueur",
    hand: [],
    score: 0,
    hasOpened: false,
    connected: true,
    ready: false
  };
}

export function createGame(roomCode: string, hostName: string, maxPlayers: number, options?: Partial<GameOptions>): GameState {
  const boundedMaxPlayers = Math.min(6, Math.max(2, Math.floor(maxPlayers)));
  const host = createPlayer(hostName);
  host.ready = true;

  return {
    roomCode,
    hostId: host.id,
    maxPlayers: boundedMaxPlayers,
    status: "lobby",
    options: { ...DEFAULT_OPTIONS, ...options },
    players: [host],
    roundNumber: 0,
    currentPlayerIndex: 0,
    phase: "action_phase",
    turnHasPlay: false,
    table: [],
    drawPile: [],
    history: [{ at: Date.now(), message: `${host.name} a cree le salon.` }]
  };
}

export function addPlayer(game: GameState, name: string): ActionResult<PlayerState> {
  if (game.status !== "lobby") return fail("La partie a deja commence.");
  if (game.players.length >= game.maxPlayers) return fail("Le salon est complet.");

  const player = createPlayer(name);
  game.players.push(player);
  game.history.push({ at: Date.now(), message: `${player.name} a rejoint le salon.` });
  return ok(player);
}

export function setPlayerReady(game: GameState, playerId: string, ready: boolean): ActionResult {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return fail("Joueur introuvable.");
  if (game.status !== "lobby") return fail("La partie n'est plus dans le lobby.");
  player.ready = ready;
  game.history.push({ at: Date.now(), message: `${player.name} est ${ready ? "pret" : "pas pret"}.` });
  return ok(game);
}

export function shuffleCards(cards: Card[], random: () => number = Math.random): Card[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function startRound(game: GameState, random: () => number = Math.random): ActionResult {
  if (game.players.length < 2) return fail("Il faut au moins 2 joueurs.");
  if (game.players.length > 6) return fail("Il faut au maximum 6 joueurs.");

  game.status = "dealing";
  const deck = shuffleCards(createDeck(), random);
  for (const player of game.players) {
    player.hand = [];
    player.hasOpened = false;
  }

  for (let round = 0; round < 13; round += 1) {
    for (const player of game.players) {
      const card = deck.pop();
      if (!card) return fail("Deck insuffisant.");
      player.hand.push(card);
    }
  }

  for (const player of game.players) {
    player.hand = sortCards(player.hand);
  }

  game.status = "playing";
  game.roundNumber += 1;
  game.currentPlayerIndex = 0;
  game.phase = "action_phase";
  game.turnHasPlay = false;
  game.table = [];
  game.drawPile = deck;
  game.roundResult = undefined;
  game.gameWinnerId = undefined;
  game.history.push({ at: Date.now(), message: `La manche ${game.roundNumber} commence.` });
  return ok(game);
}

export function canStartFromLobby(game: GameState): boolean {
  return (
    game.status === "lobby" &&
    game.players.length === game.maxPlayers &&
    game.players.length >= 2 &&
    game.players.every((player) => player.ready)
  );
}

export function currentPlayer(game: GameState): PlayerState | null {
  return game.players[game.currentPlayerIndex] ?? null;
}

function assertCurrentPlayer(game: GameState, playerId: string): ActionResult<PlayerState> {
  if (game.status !== "playing") return fail("La manche n'est pas en cours.");
  if (game.phase !== "action_phase") return fail("Le tour n'est pas en phase d'action.");
  const player = currentPlayer(game);
  if (!player || player.id !== playerId) return fail("Ce n'est pas votre tour.");
  return ok(player);
}

function nextConnectedPlayerIndex(game: GameState): number {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (game.currentPlayerIndex + offset) % game.players.length;
    if (game.players[index].connected) return index;
  }
  return (game.currentPlayerIndex + 1) % game.players.length;
}

function passToNextPlayer(game: GameState): void {
  game.currentPlayerIndex = nextConnectedPlayerIndex(game);
  game.phase = "action_phase";
  game.turnHasPlay = false;
}

export function drawCardAndPass(game: GameState, playerId: string): ActionResult {
  const playerResult = assertCurrentPlayer(game, playerId);
  if (!playerResult.ok) return playerResult;
  if (game.turnHasPlay) return fail("Vous avez deja pose pendant ce tour; terminez le tour sans piocher.");
  if (game.drawPile.length === 0) return fail("La pioche est vide.");

  const player = playerResult.value;
  const card = game.drawPile.pop();
  if (!card) return fail("La pioche est vide.");

  player.hand = sortCards([...player.hand, card]);
  game.history.push({ at: Date.now(), message: `${player.name} a pioche une carte et passe son tour.` });
  passToNextPlayer(game);
  return ok(game);
}

function canonicalizeTableFromAuthority(newTable: Meld[], authorityCards: Map<string, Card>): ActionResult<Meld[]> {
  const seen = new Set<string>();
  const canonicalTable: Meld[] = [];

  for (const meld of newTable) {
    const cards: Card[] = [];
    for (const proposedCard of meld.cards) {
      if (seen.has(proposedCard.id)) return fail(`Carte dupliquee: ${proposedCard.id}.`);
      seen.add(proposedCard.id);

      const authoritativeCard = authorityCards.get(proposedCard.id);
      if (!authoritativeCard) return fail(`Carte inconnue ou non disponible: ${proposedCard.id}.`);
      cards.push(authoritativeCard);
    }
    canonicalTable.push({ id: meld.id || randomId("meld"), ownerId: meld.ownerId, cards });
  }

  return ok(canonicalTable);
}

function oldMeldsUnchanged(oldTable: Meld[], newTable: Meld[]): boolean {
  return oldTable.every((oldMeld) => {
    const matching = newTable.find((meld) => meld.id === oldMeld.id);
    return Boolean(matching && sameCardSet(oldMeld.cards, matching.cards));
  });
}

function tableSignature(table: Meld[]): string {
  return table
    .map((meld) => `${meld.id}:${meld.cards.map((card) => card.id).sort().join(",")}`)
    .sort()
    .join("|");
}

export function proposeTable(game: GameState, playerId: string, proposedTable: Meld[]): ActionResult {
  const playerResult = assertCurrentPlayer(game, playerId);
  if (!playerResult.ok) return playerResult;

  const player = playerResult.value;
  const oldTable = game.table;
  const oldTableIds = tableCardIds(oldTable);

  const authorityCards = new Map<string, Card>();
  for (const card of player.hand) authorityCards.set(card.id, card);
  for (const meld of oldTable) {
    for (const card of meld.cards) authorityCards.set(card.id, card);
  }

  const canonicalResult = canonicalizeTableFromAuthority(proposedTable, authorityCards);
  if (!canonicalResult.ok) return canonicalResult;

  const newTable = canonicalResult.value;
  const tableValidation = validateTable(newTable);
  if (!tableValidation.valid) {
    return fail(tableValidation.reason ?? "Le plateau final doit contenir uniquement des combinaisons valides.");
  }

  const newTableIds = tableCardIds(newTable);
  const usedFromHand = player.hand.filter((card) => newTableIds.has(card.id));
  const removedFromTable: Card[] = [];
  for (const meld of oldTable) {
    for (const card of meld.cards) {
      if (!newTableIds.has(card.id)) removedFromTable.push(card);
    }
  }

  if (!player.hasOpened) {
    if (!oldMeldsUnchanged(oldTable, newTable)) {
      return fail("Vous devez d'abord faire votre premiere pose.");
    }

    const oldMeldIds = new Set(oldTable.map((meld) => meld.id));
    const addedMelds = newTable.filter((meld) => !oldMeldIds.has(meld.id));
    if (addedMelds.length === 0) return fail("La premiere pose doit ajouter au moins une combinaison.");
    if (addedMelds.some((meld) => meld.cards.some((card) => oldTableIds.has(card.id)))) {
      return fail("La premiere pose doit utiliser uniquement des cartes de votre main.");
    }

    const firstPosePoints = totalMeldPoints(addedMelds);
    if (firstPosePoints < game.options.firstMeldMinimum) {
      return fail(`Votre premiere pose doit faire au moins ${game.options.firstMeldMinimum} points.`);
    }

    player.hasOpened = true;
  } else {
    const changed = tableSignature(oldTable) !== tableSignature(newTable);
    if (!changed) return fail("Le plateau propose ne change rien.");
    if (usedFromHand.length === 0) {
      return fail("Vous devez poser au moins une carte de votre main pendant ce tour.");
    }
  }

  if (usedFromHand.length === 0) {
    return fail("Vous devez poser au moins une carte de votre main.");
  }

  player.hand = sortCards([...player.hand.filter((card) => !newTableIds.has(card.id)), ...removedFromTable]);
  game.table = newTable;
  game.turnHasPlay = true;
  game.history.push({ at: Date.now(), message: `${player.name} a valide un nouveau plateau.` });

  if (player.hand.length === 0) {
    return finishRoundWithEmptyHand(game, player.id);
  }

  return ok(game);
}

export function endTurn(game: GameState, playerId: string): ActionResult {
  const playerResult = assertCurrentPlayer(game, playerId);
  if (!playerResult.ok) return playerResult;
  if (!game.turnHasPlay) return fail("Vous devez poser au moins une carte ou piocher pour passer.");

  const tableValidation = validateTable(game.table);
  if (!tableValidation.valid) {
    return fail(tableValidation.reason ?? "Le plateau final doit contenir uniquement des combinaisons valides.");
  }

  const player = playerResult.value;
  if (player.hand.length === 0) {
    return finishRoundWithEmptyHand(game, player.id);
  }

  game.history.push({ at: Date.now(), message: `${player.name} termine son tour.` });
  passToNextPlayer(game);
  return ok(game);
}

function handPenalty(game: GameState, player: PlayerState, winnerIds: Set<string>, zeroWinners: boolean): number {
  if (zeroWinners && winnerIds.has(player.id)) return 0;
  if (game.options.applyUnopenedPenalty && !player.hasOpened && !winnerIds.has(player.id)) {
    return game.options.unopenedPenalty;
  }
  return scoreCards(player.hand);
}

function applyRoundResult(
  game: GameState,
  winnerIds: string[],
  reason: "empty_hand" | "draw_pile_empty",
  zeroWinners: boolean
): ActionResult {
  const winnerSet = new Set(winnerIds);
  const firstWinner = game.players.find((player) => winnerSet.has(player.id));
  if (!firstWinner) return fail("Gagnant introuvable.");

  const penalties: RoundPenalty[] = game.players.map((player) => {
    const neverOpened = !player.hasOpened && !winnerSet.has(player.id);
    const penalty = handPenalty(game, player, winnerSet, zeroWinners);
    player.score += penalty;
    return {
      playerId: player.id,
      playerName: player.name,
      penalty,
      totalScore: player.score,
      remainingCards: player.hand.length,
      neverOpened
    };
  });

  game.roundResult = {
    roundNumber: game.roundNumber,
    winnerId: firstWinner.id,
    winnerIds,
    isTie: winnerIds.length > 1,
    reason,
    penalties
  };

  const finalRound = game.roundNumber >= game.options.roundsToWin;
  game.status = finalRound ? "game_over" : "round_finished";
  game.phase = "action_phase";
  game.turnHasPlay = false;
  game.gameWinnerId = finalRound
    ? [...game.players].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))[0]?.id
    : undefined;
  game.history.push({
    at: Date.now(),
    message:
      reason === "empty_hand"
        ? `${firstWinner.name} termine la manche.`
        : winnerIds.length > 1
          ? "La pioche est vide: egalite sur la manche."
          : `La pioche est vide: ${firstWinner.name} gagne la manche aux points.`
  });
  return ok(game);
}

export function finishRoundWithEmptyHand(game: GameState, winnerId: string): ActionResult {
  return applyRoundResult(game, [winnerId], "empty_hand", true);
}

export function finishRoundIfDrawPileEmpty(game: GameState, playerId: string): ActionResult {
  const playerResult = assertCurrentPlayer(game, playerId);
  if (!playerResult.ok) return playerResult;
  if (game.turnHasPlay) return fail("Vous avez deja pose pendant ce tour; terminez le tour.");
  if (game.drawPile.length > 0) return fail("La pioche n'est pas vide.");

  const scoredPlayers = game.players.map((player) => ({
    player,
    points: game.options.applyUnopenedPenalty && !player.hasOpened ? game.options.unopenedPenalty : scoreCards(player.hand)
  }));
  const bestPoints = Math.min(...scoredPlayers.map((entry) => entry.points));
  const winnerIds = scoredPlayers.filter((entry) => entry.points === bestPoints).map((entry) => entry.player.id);
  return applyRoundResult(game, winnerIds, "draw_pile_empty", false);
}

export function getRanking(game: GameState): PlayerState[] {
  return [...game.players].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
}

export function getPublicGameStateForPlayer(game: GameState, playerId: string): PublicGameState {
  const player = game.players.find((candidate) => candidate.id === playerId);
  const current = currentPlayer(game);

  return {
    roomCode: game.roomCode,
    status: game.status,
    maxPlayers: game.maxPlayers,
    options: game.options,
    roundNumber: game.roundNumber,
    playerId,
    hostId: game.hostId,
    hand: player ? sortCards(player.hand) : [],
    players: game.players.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      score: candidate.score,
      hasOpened: candidate.hasOpened,
      connected: candidate.connected,
      ready: candidate.ready,
      handCount: candidate.hand.length,
      isHost: candidate.id === game.hostId
    })),
    opponentCardCounts: Object.fromEntries(
      game.players.filter((candidate) => candidate.id !== playerId).map((candidate) => [candidate.id, candidate.hand.length])
    ),
    table: game.table,
    drawPileCount: game.drawPile.length,
    scores: Object.fromEntries(game.players.map((candidate) => [candidate.id, candidate.score])),
    currentPlayerId: current?.id ?? null,
    phase: game.phase,
    turnHasPlay: game.turnHasPlay,
    history: game.history.slice(-20),
    roundResult: game.roundResult,
    gameWinnerId: game.gameWinnerId
  };
}

export function markDisconnected(game: GameState, playerId: string): void {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  player.connected = false;
  player.ready = false;
  game.history.push({ at: Date.now(), message: `${player.name} s'est deconnecte.` });
}

export function markConnected(game: GameState, playerId: string): void {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  player.connected = true;
  game.history.push({ at: Date.now(), message: `${player.name} est reconnecte.` });
}
