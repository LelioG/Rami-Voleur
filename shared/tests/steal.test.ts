import { proposeTable } from "../src";
import { c, makeStartedGame, meld, setTurn } from "./helpers";

describe("vol et reorganisation", () => {
  test("prend une extremite d'une suite de 4 en laissant une suite valide de 3", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    game.table = [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts"), c("8", "hearts")])];
    player.hand = [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")];

    const result = proposeTable(game, player.id, [
      meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts")]),
      meld("set9", [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")])
    ]);

    expect(result.ok).toBe(true);
    expect(player.hand.map((card) => card.id)).toContain(c("8", "hearts").id);
  });

  test("refuse de prendre une carte d'une suite de 3", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    game.table = [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts")])];
    player.hand = [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")];

    const result = proposeTable(game, player.id, [
      meld("run", [c("5", "hearts"), c("6", "hearts")]),
      meld("set9", [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")])
    ]);

    expect(result.ok).toBe(false);
  });

  test("casse une suite longue en plusieurs combinaisons valides", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    game.table = [
      meld("long", [c("3", "hearts"), c("4", "hearts"), c("5", "hearts"), c("6", "hearts"), c("7", "hearts"), c("8", "hearts")])
    ];
    player.hand = [c("Q", "clubs"), c("Q", "spades"), c("Q", "diamonds")];

    const result = proposeTable(game, player.id, [
      meld("low", [c("3", "hearts"), c("4", "hearts"), c("5", "hearts")]),
      meld("high", [c("6", "hearts"), c("7", "hearts"), c("8", "hearts")]),
      meld("queens", [c("Q", "clubs"), c("Q", "spades"), c("Q", "diamonds")])
    ]);

    expect(result.ok).toBe(true);
  });

  test("deplace une carte vers une autre combinaison et refuse carte seule ou paire", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    game.table = [
      meld("a", [c("4", "hearts"), c("5", "hearts"), c("6", "hearts")]),
      meld("b", [c("7", "hearts"), c("8", "hearts"), c("9", "hearts")])
    ];
    player.hand = [c("3", "hearts")];

    const moved = proposeTable(game, player.id, [
      meld("a", [c("3", "hearts"), c("4", "hearts"), c("5", "hearts")]),
      meld("b", [c("6", "hearts"), c("7", "hearts"), c("8", "hearts"), c("9", "hearts")])
    ]);
    expect(moved.ok).toBe(true);

    const invalidGame = makeStartedGame(2);
    const invalidPlayer = invalidGame.players[0];
    setTurn(invalidGame);
    invalidPlayer.hasOpened = true;
    invalidGame.table = [meld("run", [c("5", "spades"), c("6", "spades"), c("7", "spades")])];
    invalidPlayer.hand = [c("K", "clubs"), c("K", "spades"), c("K", "diamonds")];
    const invalid = proposeTable(invalidGame, invalidPlayer.id, [
      meld("pair", [c("5", "spades"), c("6", "spades")]),
      meld("kings", invalidPlayer.hand)
    ]);
    expect(invalid.ok).toBe(false);
  });

  test("refuse vol sans poser une carte de main et refuse duplication", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game);
    player.hasOpened = true;
    game.table = [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts"), c("8", "hearts")])];
    player.hand = [];

    const noHandCard = proposeTable(game, player.id, [meld("run", [c("5", "hearts"), c("6", "hearts"), c("7", "hearts")])]);
    expect(noHandCard.ok).toBe(false);

    player.hand = [c("9", "clubs"), c("9", "spades"), c("9", "diamonds")];
    const duplicate = proposeTable(game, player.id, [
      meld("dup", [c("5", "hearts"), c("5", "hearts"), c("6", "hearts")]),
      meld("set9", player.hand)
    ]);
    expect(duplicate.ok).toBe(false);
  });
});
