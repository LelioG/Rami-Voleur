import { getPublicGameStateForPlayer } from "../src";
import { allCardIds, makeStartedGame } from "./helpers";

describe("distribution", () => {
  test("distribue 13 cartes par joueur et cree seulement une pioche cachee", () => {
    const game = makeStartedGame(4);
    expect(game.players.every((player) => player.hand.length === 13)).toBe(true);
    expect("discardPile" in game).toBe(false);
    expect(game.drawPile).toHaveLength(104 - 4 * 13);
    expect(game.phase).toBe("action_phase");
  });

  test("ne duplique aucune carte apres distribution", () => {
    const game = makeStartedGame(6);
    const ids = allCardIds(game);
    expect(ids).toHaveLength(104);
    expect(new Set(ids).size).toBe(104);
  });

  test("l'etat public ne contient ni mains adverses ni ordre de pioche", () => {
    const game = makeStartedGame(3);
    const publicState = getPublicGameStateForPlayer(game, game.players[0].id);
    expect(publicState.hand).toHaveLength(13);
    expect(publicState.opponentCardCounts[game.players[1].id]).toBe(13);
    expect(publicState.drawPileCount).toBe(104 - 3 * 13);
    expect("drawPile" in publicState).toBe(false);
    expect("discardPile" in publicState).toBe(false);
    expect("discardTop" in publicState).toBe(false);
    expect(JSON.stringify(publicState)).not.toContain(game.players[1].hand[0].id);
  });
});
