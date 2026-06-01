import { drawCardAndPass, proposeTable } from "../src";
import { c, makeStartedGame, meld, setTurn } from "./helpers";

describe("premiere pose", () => {
  test("accepte une premiere pose a 40 points ou plus et marque le joueur", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hand = [
      c("10", "hearts"),
      c("10", "spades"),
      c("10", "clubs"),
      c("K", "hearts"),
      c("K", "spades"),
      c("K", "clubs")
    ];

    const result = proposeTable(game, player.id, [
      meld("m1", [c("10", "hearts"), c("10", "spades"), c("10", "clubs")]),
      meld("m2", [c("K", "hearts"), c("K", "spades"), c("K", "clubs")])
    ]);

    expect(result.ok).toBe(true);
    expect(player.hasOpened).toBe(true);
    expect(player.hand).toHaveLength(0);
  });

  test("refuse une premiere pose sous 40 points ou invalide", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hand = [c("2", "hearts"), c("3", "hearts"), c("4", "hearts")];

    const under = proposeTable(game, player.id, [meld("m1", player.hand)]);
    expect(under.ok).toBe(false);
    expect(player.hasOpened).toBe(false);
    expect(game.phase).toBe("action_phase");
    expect(drawCardAndPass(game, player.id).ok).toBe(true);

    setTurn(game, 0);
    player.hand = [c("2", "hearts"), c("2", "spades"), c("3", "clubs")];
    const invalid = proposeTable(game, player.id, [meld("m2", player.hand)]);
    expect(invalid.ok).toBe(false);
  });

  test("refuse le vol avant premiere pose", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    game.table = [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts"), c("8", "hearts")])];
    player.hand = [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")];

    const result = proposeTable(game, player.id, [
      meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts")]),
      meld("own", player.hand)
    ]);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(/premiere pose/i);
  });

  test("joueur ouvert peut poser moins de 40 points", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    player.hand = [c("2", "hearts"), c("2", "spades"), c("2", "clubs"), c("A", "diamonds")];

    const result = proposeTable(game, player.id, [meld("twos", [c("2", "hearts"), c("2", "spades"), c("2", "clubs")])]);

    expect(result.ok).toBe(true);
    expect(player.hand.map((card) => card.id)).toEqual([c("A", "diamonds").id]);
  });
});
