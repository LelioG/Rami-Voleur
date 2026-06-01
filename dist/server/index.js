// server/src/index.ts
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// shared/src/types.ts
var SUITS = ["spades", "hearts", "diamonds", "clubs"];
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// shared/src/deck.ts
var SUIT_LABELS = {
  spades: "pique",
  hearts: "coeur",
  diamonds: "carreau",
  clubs: "trefle"
};
var RANK_LABELS = {
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
var ASSET_RANKS = {
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
function rankPoints(rank) {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}
function cardToAssetPath(card) {
  return `/cards/card_${card.suit}_${ASSET_RANKS[card.rank]}.png`;
}
function createCard(deckIndex, suit, rank) {
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
function createDeck() {
  const deck = [];
  for (const deckIndex of [1, 2]) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(deckIndex, suit, rank));
      }
    }
  }
  return deck;
}
function isKnownSuit(value) {
  return typeof value === "string" && SUITS.includes(value);
}
function isKnownRank(value) {
  return typeof value === "string" && RANKS.includes(value);
}
function containsJokerMarker(value) {
  return typeof value === "string" && /joker/i.test(value);
}
function assertNoJokerCard(card) {
  return !containsJokerMarker(card.id) && !containsJokerMarker(card.label) && !containsJokerMarker(card.assetPath);
}
function cardIdentity(card) {
  return `${card.suit}-${card.rank}`;
}
function cardSortValue(card) {
  const rankIndex = RANKS.indexOf(card.rank);
  const suitIndex = SUITS.indexOf(card.suit);
  return suitIndex * 100 + rankIndex * 2 + card.deckIndex;
}
function sortCards(cards) {
  return [...cards].sort((a, b) => cardSortValue(a) - cardSortValue(b));
}

// shared/src/rules.ts
var RUN_VALUES = {
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
function scoreCards(cards) {
  return cards.reduce((total, card) => total + rankPoints(card.rank), 0);
}
function sortedNumbers(values) {
  return [...values].sort((a, b) => a - b);
}
function areConsecutive(values) {
  const sorted = sortedNumbers(values);
  return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
}
function runIsConsecutive(cards) {
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
  const highAceValues = sortedNumbers(ranks.map((rank) => rank === "A" ? 14 : RUN_VALUES[rank]));
  const validHighAceRun = highAceValues[highAceValues.length - 1] === 14 && areConsecutive(highAceValues);
  return validHighAceRun;
}
function validateMeld(cards) {
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
function validateTable(table) {
  const seenCardIds = /* @__PURE__ */ new Set();
  const melds = [];
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
function tableCardIds(table) {
  const ids = /* @__PURE__ */ new Set();
  for (const meld of table) {
    for (const card of meld.cards) ids.add(card.id);
  }
  return ids;
}
function meldPoints(meld) {
  return scoreCards(meld.cards);
}
function totalMeldPoints(melds) {
  return melds.reduce((total, meld) => total + meldPoints(meld), 0);
}
function sameCardSet(a, b) {
  if (a.length !== b.length) return false;
  const aIds = new Set(a.map((card) => card.id));
  return b.every((card) => aIds.has(card.id));
}

// shared/src/game.ts
var DEFAULT_OPTIONS = {
  firstMeldMinimum: 40,
  unopenedPenalty: 100,
  applyUnopenedPenalty: true,
  roundsToWin: 5
};
function ok(value) {
  return { ok: true, value };
}
function fail(error) {
  return { ok: false, error };
}
function randomId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
function generateRoomCode(existingCodes = []) {
  const existing = new Set(existingCodes);
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (existing.has(code));
  return code;
}
function createPlayer(name) {
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
function createGame(roomCode, hostName, maxPlayers, options) {
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
function addPlayer(game, name) {
  if (game.status !== "lobby") return fail("La partie a deja commence.");
  if (game.players.length >= game.maxPlayers) return fail("Le salon est complet.");
  const player = createPlayer(name);
  game.players.push(player);
  game.history.push({ at: Date.now(), message: `${player.name} a rejoint le salon.` });
  return ok(player);
}
function setPlayerReady(game, playerId, ready) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return fail("Joueur introuvable.");
  if (game.status !== "lobby") return fail("La partie n'est plus dans le lobby.");
  player.ready = ready;
  game.history.push({ at: Date.now(), message: `${player.name} est ${ready ? "pret" : "pas pret"}.` });
  return ok(game);
}
function shuffleCards(cards, random = Math.random) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
function startRound(game, random = Math.random) {
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
  game.roundResult = void 0;
  game.gameWinnerId = void 0;
  game.history.push({ at: Date.now(), message: `La manche ${game.roundNumber} commence.` });
  return ok(game);
}
function canStartFromLobby(game) {
  return game.status === "lobby" && game.players.length === game.maxPlayers && game.players.length >= 2 && game.players.every((player) => player.ready);
}
function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}
function assertCurrentPlayer(game, playerId) {
  if (game.status !== "playing") return fail("La manche n'est pas en cours.");
  if (game.phase !== "action_phase") return fail("Le tour n'est pas en phase d'action.");
  const player = currentPlayer(game);
  if (!player || player.id !== playerId) return fail("Ce n'est pas votre tour.");
  return ok(player);
}
function nextConnectedPlayerIndex(game) {
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (game.currentPlayerIndex + offset) % game.players.length;
    if (game.players[index].connected) return index;
  }
  return (game.currentPlayerIndex + 1) % game.players.length;
}
function passToNextPlayer(game) {
  game.currentPlayerIndex = nextConnectedPlayerIndex(game);
  game.phase = "action_phase";
  game.turnHasPlay = false;
}
function drawCardAndPass(game, playerId) {
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
function canonicalizeTableFromAuthority(newTable, authorityCards) {
  const seen = /* @__PURE__ */ new Set();
  const canonicalTable = [];
  for (const meld of newTable) {
    const cards = [];
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
function oldMeldsUnchanged(oldTable, newTable) {
  return oldTable.every((oldMeld) => {
    const matching = newTable.find((meld) => meld.id === oldMeld.id);
    return Boolean(matching && sameCardSet(oldMeld.cards, matching.cards));
  });
}
function tableSignature(table) {
  return table.map((meld) => `${meld.id}:${meld.cards.map((card) => card.id).sort().join(",")}`).sort().join("|");
}
function proposeTable(game, playerId, proposedTable) {
  const playerResult = assertCurrentPlayer(game, playerId);
  if (!playerResult.ok) return playerResult;
  const player = playerResult.value;
  const oldTable = game.table;
  const oldTableIds = tableCardIds(oldTable);
  const authorityCards = /* @__PURE__ */ new Map();
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
  const removedFromTable = [];
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
function endTurn(game, playerId) {
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
function handPenalty(game, player, winnerIds, zeroWinners) {
  if (zeroWinners && winnerIds.has(player.id)) return 0;
  if (game.options.applyUnopenedPenalty && !player.hasOpened && !winnerIds.has(player.id)) {
    return game.options.unopenedPenalty;
  }
  return scoreCards(player.hand);
}
function applyRoundResult(game, winnerIds, reason, zeroWinners) {
  const winnerSet = new Set(winnerIds);
  const firstWinner = game.players.find((player) => winnerSet.has(player.id));
  if (!firstWinner) return fail("Gagnant introuvable.");
  const penalties = game.players.map((player) => {
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
  game.gameWinnerId = finalRound ? [...game.players].sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))[0]?.id : void 0;
  game.history.push({
    at: Date.now(),
    message: reason === "empty_hand" ? `${firstWinner.name} termine la manche.` : winnerIds.length > 1 ? "La pioche est vide: egalite sur la manche." : `La pioche est vide: ${firstWinner.name} gagne la manche aux points.`
  });
  return ok(game);
}
function finishRoundWithEmptyHand(game, winnerId) {
  return applyRoundResult(game, [winnerId], "empty_hand", true);
}
function finishRoundIfDrawPileEmpty(game, playerId) {
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
function getPublicGameStateForPlayer(game, playerId) {
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
function markDisconnected(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (!player) return;
  player.connected = false;
  player.ready = false;
  game.history.push({ at: Date.now(), message: `${player.name} s'est deconnecte.` });
}

// server/src/index.ts
var PORT = Number(process.env.PORT ?? 3e3);
var isProduction = process.env.NODE_ENV === "production";
var app = express();
var server = http.createServer(app);
var io = new Server(server, {
  cors: isProduction ? void 0 : {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
  }
});
var rooms = /* @__PURE__ */ new Map();
var socketPlayers = /* @__PURE__ */ new Map();
function ackOk(data) {
  return { ok: true, data };
}
function ackFail(error) {
  return { ok: false, error };
}
function getRoom(roomCode) {
  return rooms.get(roomCode.trim().toUpperCase());
}
async function broadcastRoom(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return;
  const socketIds = await io.in(room.roomCode).allSockets();
  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    const playerId = socket?.data.playerId;
    if (playerId) {
      socket?.emit("state:update", getPublicGameStateForPlayer(room, playerId));
    }
  }
}
function attachPlayer(socket, roomCode, playerId) {
  socket.data.roomCode = roomCode;
  socket.data.playerId = playerId;
  socketPlayers.set(socket.id, { roomCode, playerId });
  socket.join(roomCode);
}
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});
if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
io.on("connection", (socket) => {
  socket.on("room:create", async (payload, callback) => {
    try {
      const roomCode = generateRoomCode(rooms.keys());
      const game = createGame(roomCode, payload.name, payload.maxPlayers);
      rooms.set(roomCode, game);
      const playerId = game.hostId;
      attachPlayer(socket, roomCode, playerId);
      callback?.(ackOk({ roomCode, playerId, state: getPublicGameStateForPlayer(game, playerId) }));
      await broadcastRoom(roomCode);
    } catch (error) {
      callback?.(ackFail(error instanceof Error ? error.message : "Creation impossible."));
    }
  });
  socket.on("room:join", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    if (!game) {
      callback?.(ackFail("Salon introuvable."));
      return;
    }
    const result = addPlayer(game, payload.name);
    if (!result.ok) {
      callback?.(ackFail(result.error));
      return;
    }
    attachPlayer(socket, game.roomCode, result.value.id);
    callback?.(ackOk({ roomCode: game.roomCode, playerId: result.value.id, state: getPublicGameStateForPlayer(game, result.value.id) }));
    await broadcastRoom(game.roomCode);
  });
  socket.on("room:ready", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    const result = setPlayerReady(game, playerId, Boolean(payload.ready));
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:start", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    if (playerId !== game.hostId) {
      callback?.(ackFail("Seul l'hote peut lancer la partie."));
      return;
    }
    if (!canStartFromLobby(game)) {
      callback?.(ackFail("Le salon doit etre complet et tous les joueurs doivent etre prets."));
      return;
    }
    const result = startRound(game);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:newRound", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    if (playerId !== game.hostId) {
      callback?.(ackFail("Seul l'hote peut relancer une manche."));
      return;
    }
    if (game.status !== "round_finished") {
      callback?.(ackFail("La manche precedente n'est pas terminee."));
      return;
    }
    const result = startRound(game);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:draw", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    const result = drawCardAndPass(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:proposeTable", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    const result = proposeTable(game, playerId, payload.table);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:endTurn", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    const result = endTurn(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("game:endEmptyDraw", async (payload, callback) => {
    const game = getRoom(payload.roomCode);
    const playerId = socket.data.playerId;
    if (!game || !playerId) {
      callback?.(ackFail("Session introuvable."));
      return;
    }
    const result = finishRoundIfDrawPileEmpty(game, playerId);
    callback?.(result.ok ? ackOk({ state: getPublicGameStateForPlayer(game, playerId) }) : ackFail(result.error));
    await broadcastRoom(game.roomCode);
  });
  socket.on("disconnect", async () => {
    const session = socketPlayers.get(socket.id);
    socketPlayers.delete(socket.id);
    if (!session) return;
    const game = getRoom(session.roomCode);
    if (!game) return;
    markDisconnected(game, session.playerId);
    await broadcastRoom(session.roomCode);
  });
});
server.listen(PORT, () => {
  console.log(`Rami voleur server listening on port ${PORT}`);
});
