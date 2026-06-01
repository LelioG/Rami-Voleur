import * as shared from "../src";
import { drawCardAndPass, getPublicGameStateForPlayer, proposeTable } from "../src";
import { c, makeStartedGame, meld, setTurn } from "./helpers";

describe("securite serveur sans defausse", () => {
  test("ne fuit pas les mains adverses ni l'ordre de la pioche", () => {
    const game = makeStartedGame(3);
    const publicState = getPublicGameStateForPlayer(game, game.players[0].id);
    const serialized = JSON.stringify(publicState);
    expect(publicState.hand).toHaveLength(13);
    expect(publicState.players[0].hasOpened).toBe(false);
    expect(publicState.drawPileCount).toBe(game.drawPile.length);
    expect(serialized).not.toContain(game.players[1].hand[0].id);
    expect(serialized).not.toContain(game.drawPile[0].id);
    expect("drawPile" in publicState).toBe(false);
    expect("discardPile" in publicState).toBe(false);
    expect("discardTop" in publicState).toBe(false);
  });

  test("refuse carte inconnue, carte adverse et duplication dans un plateau propose", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    const opponent = game.players[1];
    setTurn(game);
    player.hasOpened = true;
    player.hand = [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")];
    opponent.hand = [c("A", "hearts")];
    game.table = [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts")])];

    const unknown = proposeTable(game, player.id, [
      meld("fake", [{ ...c("A", "hearts"), id: "deck3-hearts-A" }]),
      meld("set9", player.hand)
    ]);
    expect(unknown.ok).toBe(false);

    const opponentCard = proposeTable(game, player.id, [
      meld("bad", [opponent.hand[0], c("2", "hearts"), c("3", "hearts")]),
      meld("set9", player.hand)
    ]);
    expect(opponentCard.ok).toBe(false);

    const duplicated = proposeTable(game, player.id, [
      meld("dup", [c("5", "hearts"), c("5", "hearts"), c("6", "hearts")]),
      meld("set9", player.hand)
    ]);
    expect(duplicated.ok).toBe(false);
  });

  test("refuse les actions hors tour et n'exporte aucune action de defausse", () => {
    const game = makeStartedGame(2);
    setTurn(game, 0);
    expect(drawCardAndPass(game, game.players[1].id).ok).toBe(false);
    expect("discardCard" in shared).toBe(false);
  });
});
