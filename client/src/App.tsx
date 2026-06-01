import { ArrowDownUp, Check, Copy, GripHorizontal, LogIn, Plus, ShieldCheck, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card, Meld, PublicGameState, sortCards, validateTable } from "@shared";
import { ActionBar, DrawPile, GameTable, LobbyCard, PlayerSeat, PlayingCard, ScoreBoard } from "./components/game";
import { Badge, Button, Input, Panel, SectionHeader, Select, Toast } from "./components/ui";

type Ack<T = unknown> = { ok: boolean; error?: string; data?: T };
type Screen = "home" | "lobby" | "game";

const socket: Socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  transports: ["websocket", "polling"]
});

function newMeldId(): string {
  return `meld-${crypto.randomUUID()}`;
}

function cloneTable(table: Meld[]): Meld[] {
  return table.map((meld) => ({ ...meld, cards: [...meld.cards] }));
}

function cardIds(cards: Card[]): Set<string> {
  return new Set(cards.map((card) => card.id));
}

function removeCardsFromDraft(table: Meld[], ids: Set<string>): Meld[] {
  return table
    .map((meld) => ({ ...meld, cards: meld.cards.filter((card) => !ids.has(card.id)) }))
    .filter((meld) => meld.cards.length > 0);
}

function selectedTableCardsFrom(table: Meld[], selectedIds: Set<string>): Card[] {
  const cards: Card[] = [];
  for (const meld of table) {
    for (const card of meld.cards) {
      if (selectedIds.has(card.id)) cards.push(card);
    }
  }
  return cards;
}

function friendlyError(message: string): string {
  if (/premiere pose|première pose|d'abord/i.test(message)) return "Vous devez d’abord faire une première pose.";
  if (/40|points/i.test(message)) return "Votre première pose doit faire au moins 40 points.";
  if (/plateau|combinaison|suite|brelan|carre|carré/i.test(message)) {
    return "Le plateau doit rester entièrement valide.";
  }
  return message;
}

function reconcileHandOrder(previousOrder: string[], hand: Card[]): string[] {
  const handIds = new Set(hand.map((card) => card.id));
  const kept = previousOrder.filter((cardId) => handIds.has(cardId));
  const known = new Set(kept);
  const added = hand.filter((card) => !known.has(card.id)).map((card) => card.id);
  return [...kept, ...added];
}

function orderHandCards(hand: Card[], orderIds: string[]): Card[] {
  const byId = new Map(hand.map((card) => [card.id, card]));
  const ordered = orderIds.flatMap((cardId) => {
    const card = byId.get(cardId);
    return card ? [card] : [];
  });
  const orderedIds = new Set(ordered.map((card) => card.id));
  return [...ordered, ...hand.filter((card) => !orderedIds.has(card.id))];
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedHandIds, setSelectedHandIds] = useState<Set<string>>(new Set());
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [draftTable, setDraftTable] = useState<Meld[]>([]);
  const [copied, setCopied] = useState(false);
  const [handOrderIds, setHandOrderIds] = useState<string[]>([]);
  const [handReorderEnabled, setHandReorderEnabled] = useState(false);
  const [draggedHandId, setDraggedHandId] = useState<string | null>(null);

  useEffect(() => {
    socket.on("state:update", (nextState: PublicGameState) => {
      setState(nextState);
      setPlayerId(nextState.playerId);
      setScreen(nextState.status === "lobby" ? "lobby" : "game");
      setDraftTable(cloneTable(nextState.table));
      setSelectedHandIds(new Set());
      setSelectedTableIds(new Set());
      setHandOrderIds((previousOrder) => reconcileHandOrder(previousOrder, nextState.hand));
    });

    return () => {
      socket.off("state:update");
    };
  }, []);

  const me = useMemo(() => state?.players.find((player) => player.id === playerId) ?? null, [playerId, state]);
  const currentPlayer = useMemo(
    () => state?.players.find((player) => player.id === state.currentPlayerId) ?? null,
    [state]
  );
  const orderedHand = useMemo(() => orderHandCards(state?.hand ?? [], handOrderIds), [handOrderIds, state]);
  const selectedHandCards = useMemo(() => orderedHand.filter((card) => selectedHandIds.has(card.id)), [orderedHand, selectedHandIds]);
  const selectedTableCards = useMemo(() => selectedTableCardsFrom(draftTable, selectedTableIds), [draftTable, selectedTableIds]);
  const draftValidation = useMemo(() => validateTable(draftTable), [draftTable]);
  const officialTableIds = useMemo(() => new Set(state?.table.flatMap((meld) => meld.cards.map((card) => card.id)) ?? []), [state]);
  const officialMeldIds = useMemo(() => new Set(state?.table.map((meld) => meld.id) ?? []), [state]);
  const draftedHandIds = useMemo(() => {
    const ids = new Set<string>();
    for (const meld of draftTable) {
      for (const card of meld.cards) {
        if (!officialTableIds.has(card.id)) ids.add(card.id);
      }
    }
    return ids;
  }, [draftTable, officialTableIds]);
  const visibleHand = useMemo(() => orderedHand.filter((card) => !draftedHandIds.has(card.id)), [draftedHandIds, orderedHand]);
  const movedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const meld of draftTable) {
      for (const card of meld.cards) {
        if (!officialTableIds.has(card.id) || selectedTableIds.has(card.id)) ids.add(card.id);
      }
    }
    return ids;
  }, [draftTable, officialTableIds, selectedTableIds]);

  function handleAck<T>(ack: Ack<T> | undefined, onOk?: (data: T) => void) {
    if (!ack) return;
    if (!ack.ok) {
      setError(friendlyError(ack.error ?? "Action refusée."));
      return;
    }
    setError(null);
    if (ack.data) onOk?.(ack.data);
  }

  function createRoom() {
    socket.emit("room:create", { name, maxPlayers }, (ack: Ack<{ roomCode: string; playerId: string; state: PublicGameState }>) =>
      handleAck(ack, (data) => {
        setPlayerId(data.playerId);
        setState(data.state);
        setDraftTable(cloneTable(data.state.table));
        setScreen("lobby");
      })
    );
  }

  function joinRoom() {
    socket.emit(
      "room:join",
      { roomCode: roomCodeInput.trim().toUpperCase(), name },
      (ack: Ack<{ roomCode: string; playerId: string; state: PublicGameState }>) =>
        handleAck(ack, (data) => {
          setPlayerId(data.playerId);
          setState(data.state);
          setDraftTable(cloneTable(data.state.table));
          setScreen("lobby");
        })
    );
  }

  function sendReady(ready: boolean) {
    if (!state) return;
    socket.emit("room:ready", { roomCode: state.roomCode, ready }, (ack: Ack) => handleAck(ack));
  }

  function startGame() {
    if (!state) return;
    socket.emit("game:start", { roomCode: state.roomCode }, (ack: Ack) => handleAck(ack));
  }

  function startNextRound() {
    if (!state) return;
    socket.emit("game:newRound", { roomCode: state.roomCode }, (ack: Ack) => handleAck(ack));
  }

  function drawAndPass() {
    if (!state) return;
    socket.emit("game:draw", { roomCode: state.roomCode }, (ack: Ack) => handleAck(ack));
  }

  function proposeDraft() {
    if (!state) return;
    socket.emit("game:proposeTable", { roomCode: state.roomCode, table: draftTable }, (ack: Ack) => handleAck(ack));
  }

  function endTurn() {
    if (!state) return;
    socket.emit("game:endTurn", { roomCode: state.roomCode }, (ack: Ack) => handleAck(ack));
  }

  function finishEmptyDrawRound() {
    if (!state) return;
    socket.emit("game:endEmptyDraw", { roomCode: state.roomCode }, (ack: Ack) => handleAck(ack));
  }

  function toggleHand(cardId: string) {
    if (handReorderEnabled) return;
    setSelectedHandIds((previous) => {
      const next = new Set(previous);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleHandReorder() {
    setHandReorderEnabled((enabled) => !enabled);
    setSelectedHandIds(new Set());
    setDraggedHandId(null);
  }

  function sortHandDisplay() {
    if (!state) return;
    setHandOrderIds(sortCards(state.hand).map((card) => card.id));
    setSelectedHandIds(new Set());
    setDraggedHandId(null);
  }

  function reorderHandCards(draggedId: string, targetId: string) {
    if (!state || draggedId === targetId) return;
    setHandOrderIds((previousOrder) => {
      const nextOrder = reconcileHandOrder(previousOrder, state.hand);
      const fromIndex = nextOrder.indexOf(draggedId);
      const toIndex = nextOrder.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0) return nextOrder;

      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);
      return [...nextOrder];
    });
  }

  function toggleTable(cardId: string) {
    setSelectedTableIds((previous) => {
      const next = new Set(previous);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function createMeldFromSelection() {
    const cards = [...selectedTableCards, ...selectedHandCards];
    if (cards.length === 0) return;
    const ids = cardIds(selectedTableCards);
    setDraftTable([...removeCardsFromDraft(draftTable, ids), { id: newMeldId(), cards }]);
    setSelectedHandIds(new Set());
    setSelectedTableIds(new Set());
  }

  function addSelectionToMeld(meldId: string) {
    const cards = [...selectedTableCards, ...selectedHandCards];
    if (cards.length === 0) return;
    const tableIds = cardIds(selectedTableCards);
    const withoutMoved = removeCardsFromDraft(draftTable, tableIds);
    setDraftTable(
      withoutMoved.map((meld) => (meld.id === meldId ? { ...meld, cards: [...meld.cards, ...cards] } : meld))
    );
    setSelectedHandIds(new Set());
    setSelectedTableIds(new Set());
  }

  function removeSelectedTableCards() {
    setDraftTable(removeCardsFromDraft(draftTable, selectedTableIds));
    setSelectedTableIds(new Set());
  }

  function resetDraft() {
    if (!state) return;
    setDraftTable(cloneTable(state.table));
    setSelectedHandIds(new Set());
    setSelectedTableIds(new Set());
    setError(null);
  }

  async function copyRoomCode(roomCode: string) {
    await navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (screen === "home") {
    return (
      <main className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero__content">
            <Badge tone="gold">Club de cartes en ligne</Badge>
            <h1>Rami Voleur</h1>
            <p>
              Une table privée, des cartes nettes, des règles validées côté serveur et le plaisir du vol de cartes en temps réel.
            </p>
            <div className="landing-rules" aria-label="Règles principales">
              <span>2 à 6 joueurs</span>
              <span>Sans jokers</span>
              <span>Vol et réorganisation</span>
              <span>Multijoueur temps réel</span>
            </div>
          </div>

          <Panel className="landing-panel" variant="elevated">
            <SectionHeader
              eyebrow="Nouvelle partie"
              title="Installez la table"
              description="Choisissez votre pseudo, créez un salon ou rejoignez un code existant."
            />
            <div className="field-grid">
              <Input label="Pseudo" maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Votre pseudo" value={name} />
              <Select label="Joueurs" onChange={(event) => setMaxPlayers(Number(event.target.value))} value={maxPlayers}>
                {[2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} joueurs
                  </option>
                ))}
              </Select>
            </div>

            <Button fullWidth disabled={!name.trim()} onClick={createRoom} icon={<Plus size={18} />}>
              Créer une partie
            </Button>

            <div className="join-box">
              <Input
                label="Code salon"
                autoCapitalize="characters"
                maxLength={8}
                onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                placeholder="AB12CD"
                value={roomCodeInput}
              />
              <Button
                variant="secondary"
                fullWidth
                disabled={!name.trim() || !roomCodeInput.trim()}
                onClick={joinRoom}
                icon={<LogIn size={18} />}
              >
                Rejoindre une partie
              </Button>
            </div>

            <Toast tone="error" message={error} />
          </Panel>
        </section>
      </main>
    );
  }

  if (screen === "lobby" && state) {
    const isHost = playerId === state.hostId;
    const canStart = isHost && state.players.length === state.maxPlayers && state.players.every((player) => player.ready);

    return (
      <main className="lobby-page">
        <Panel className="lobby-shell" variant="elevated">
          <header className="lobby-header">
            <div>
              <span className="kicker">Salon privé</span>
              <h1>{state.roomCode}</h1>
              <p>
                {state.players.length}/{state.maxPlayers} joueurs · {canStart ? "Prêt à lancer" : "En attente des joueurs"}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => copyRoomCode(state.roomCode)}
              icon={<Copy size={18} />}
              aria-label="Copier le code du salon"
            >
              {copied ? "Copié" : "Copier"}
            </Button>
          </header>

          <div className="lobby-grid">
            {state.players.map((player) => (
              <LobbyCard key={player.id} player={player} self={player.id === playerId} />
            ))}
            {Array.from({ length: state.maxPlayers - state.players.length }).map((_, index) => (
              <LobbyCard key={`empty-${index}`} />
            ))}
          </div>

          <div className="lobby-actions">
            <Button variant="secondary" onClick={() => sendReady(!me?.ready)} icon={<Check size={18} />}>
              {me?.ready ? "Annuler prêt" : "Je suis prêt"}
            </Button>
            {isHost && (
              <Button disabled={!canStart} onClick={startGame} icon={<Shuffle size={18} />}>
                Lancer la partie
              </Button>
            )}
          </div>

          <Toast tone="error" message={error} />
        </Panel>
      </main>
    );
  }

  if (!state) return null;

  const isMyTurn = state.currentPlayerId === playerId;
  const canAct = isMyTurn && state.phase === "action_phase" && state.status === "playing";
  const canDraw = canAct && !state.turnHasPlay && state.drawPileCount > 0;
  const canEndEmptyDraw = canAct && !state.turnHasPlay && state.drawPileCount === 0;
  const hasOpened = Boolean(me?.hasOpened);
  const canEditTable = canAct && hasOpened;
  const selectedCount = selectedHandCards.length + selectedTableCards.length;
  const canMoveTableSelection =
    canAct &&
    selectedTableIds.size > 0 &&
    (hasOpened || [...selectedTableIds].every((cardId) => !officialTableIds.has(cardId)));

  return (
    <main className="game-page">
      <header className="game-topbar">
        <div>
          <span className="kicker">Salon {state.roomCode}</span>
          <h1>{currentPlayer ? `Tour de ${currentPlayer.name}` : "Rami Voleur"}</h1>
        </div>
        <div className="game-topbar__badges">
          <Badge tone={isMyTurn ? "gold" : "neutral"}>{isMyTurn ? "À vous de jouer" : "En attente"}</Badge>
          <Badge tone={hasOpened ? "success" : "warning"}>{hasOpened ? "Vous avez ouvert" : "Première pose requise"}</Badge>
        </div>
      </header>

      <aside className="game-sidebar">
        <ScoreBoard state={state} />
      </aside>

      <section className="game-stage">
        <div className="table-player-strip">
          {state.players
            .filter((player) => player.id !== playerId)
            .map((player) => (
              <PlayerSeat key={player.id} player={player} active={player.id === state.currentPlayerId} />
            ))}
        </div>

        {(state.status === "round_finished" || state.status === "game_over") && state.roundResult ? (
          <Panel className="round-result" variant="elevated">
            <Badge tone="gold">
              <Sparkles size={14} />
              {state.status === "game_over" ? "Score final" : "Fin de manche"}
            </Badge>
            <h2>
              {state.roundResult.isTie
                ? "Égalité"
                : `${state.players.find((player) => player.id === state.roundResult?.winnerId)?.name ?? "Le gagnant"} remporte la manche`}
            </h2>
            <p>
              {state.roundResult.reason === "draw_pile_empty"
                ? "Pioche vide : la manche est comptée au plus petit total en main."
                : "Un joueur n’a plus aucune carte en main."}
            </p>
            <div className="result-table" role="table" aria-label="Scores de fin de manche">
              {state.roundResult.penalties.map((line) => (
                <div className="result-table__row" role="row" key={line.playerId}>
                  <span>{line.playerName}</span>
                  <strong>+{line.penalty}</strong>
                  <span>Total {line.totalScore}</span>
                </div>
              ))}
            </div>
            {state.status === "round_finished" && playerId === state.hostId && (
              <Button onClick={startNextRound} icon={<Shuffle size={18} />}>
                Nouvelle manche
              </Button>
            )}
          </Panel>
        ) : (
          <>
            <div className="table-controls">
              <DrawPile
                count={state.drawPileCount}
                disabled={!canDraw && !canEndEmptyDraw}
                canEndRound={canEndEmptyDraw}
                onDraw={canEndEmptyDraw ? finishEmptyDrawRound : drawAndPass}
              />
              <Panel className="turn-guidance">
                <ShieldCheck size={20} aria-hidden="true" />
                <div>
                  <strong>{hasOpened ? "Plateau libre" : `Première pose : ${state.options.firstMeldMinimum} points`}</strong>
                  <span>
                    {hasOpened
                      ? "Posez, complétez, volez ou piochez pour passer."
                      : "Si vous ne pouvez pas poser, piochez une carte pour passer votre tour."}
                  </span>
                </div>
              </Panel>
            </div>

            <GameTable
              draftTable={draftTable}
              canEditTable={canEditTable}
              canEditMeld={(meld) => canAct && (hasOpened || !officialMeldIds.has(meld.id))}
              selectedTableIds={selectedTableIds}
              movedIds={movedIds}
              selectedCount={selectedCount}
              onToggleTableCard={toggleTable}
              onAddSelectionToMeld={addSelectionToMeld}
            />
          </>
        )}
      </section>

      <section className="hand-panel" aria-label="Votre main">
        <div className="hand-panel__header">
          <div>
            <span className="kicker">Votre main</span>
            <h2>{state.hand.length} cartes</h2>
          </div>
          <div className="hand-panel__tools">
            <Badge tone={handReorderEnabled ? "gold" : selectedHandCards.length > 0 || selectedTableCards.length > 0 ? "gold" : "neutral"}>
              {handReorderEnabled
                ? "Réarrangement actif"
                : `${selectedCount} sélectionnée${selectedCount > 1 ? "s" : ""}`}
            </Badge>
            <Button
              variant={handReorderEnabled ? "primary" : "ghost"}
              size="sm"
              onClick={toggleHandReorder}
              icon={<GripHorizontal size={16} />}
              aria-pressed={handReorderEnabled}
            >
              Réarranger
            </Button>
            <Button variant="ghost" size="sm" onClick={sortHandDisplay} icon={<ArrowDownUp size={16} />}>
              Trier
            </Button>
          </div>
        </div>

        {handReorderEnabled && (
          <p className="hand-panel__hint">Glissez les cartes de votre main pour choisir votre ordre. Cette option ne change pas le jeu côté serveur.</p>
        )}

        <div className="hand-panel__cards">
          {visibleHand.map((card) => (
            <PlayingCard
              card={card}
              key={card.id}
              playable={canAct && !handReorderEnabled}
              selected={selectedHandIds.has(card.id)}
              disabled={!canAct && !handReorderEnabled}
              draggable={handReorderEnabled}
              dragging={draggedHandId === card.id}
              onClick={canAct && !handReorderEnabled ? () => toggleHand(card.id) : undefined}
              onDragStart={(event) => {
                if (!handReorderEnabled) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", card.id);
                setDraggedHandId(card.id);
              }}
              onDragOver={(event) => {
                if (!handReorderEnabled || draggedHandId === card.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                if (!handReorderEnabled) return;
                event.preventDefault();
                const draggedId = event.dataTransfer.getData("text/plain") || draggedHandId;
                if (draggedId) reorderHandCards(draggedId, card.id);
                setDraggedHandId(null);
              }}
              onDragEnd={() => setDraggedHandId(null)}
            />
          ))}
        </div>

        <ActionBar
          canAct={canAct}
          canEditTable={canMoveTableSelection}
          selectedCount={selectedCount}
          selectedTableCount={selectedTableIds.size}
          draftValid={draftValidation.valid}
          hasOpened={hasOpened}
          turnHasPlay={state.turnHasPlay}
          onCreateMeld={createMeldFromSelection}
          onStealToHand={removeSelectedTableCards}
          onReset={resetDraft}
          onValidate={proposeDraft}
          onEndTurn={endTurn}
        />

        <Toast tone="error" message={!draftValidation.valid ? `Le plateau doit rester entièrement valide. ${draftValidation.reason}` : error} />
      </section>
    </main>
  );
}
