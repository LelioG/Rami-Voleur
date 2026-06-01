import { finishRoundIfDrawPileEmpty, getRanking, proposeTable, startRound } from "../src";
import { c, makeStartedGame, meld, setTurn } from "./helpers";

describe("fin de manche et score sans defausse", () => {
  test("termine la manche quand un joueur vide sa main apres une pose", () => {
    const game = makeStartedGame(2);
    const winner = game.players[0];
    const other = game.players[1];
    setTurn(game, 0);
    winner.hand = [
      c("10", "hearts"),
      c("10", "spades"),
      c("10", "clubs"),
      c("K", "hearts"),
      c("K", "spades"),
      c("K", "clubs")
    ];
    other.hasOpened = true;
    other.hand = [c("A", "spades"), c("K", "diamonds"), c("Q", "clubs"), c("5", "diamonds")];
    game.table = [meld("posed", [c("7", "hearts"), c("7", "spades"), c("7", "clubs")])];

    const result = proposeTable(game, winner.id, [
      ...game.table,
      meld("tens", [c("10", "hearts"), c("10", "spades"), c("10", "clubs")]),
      meld("kings", [c("K", "hearts"), c("K", "spades"), c("K", "clubs")])
    ]);

    expect(result.ok).toBe(true);
    expect(game.status).toBe("round_finished");
    expect(winner.score).toBe(0);
    expect(other.score).toBe(36);
    expect(game.roundResult?.reason).toBe("empty_hand");
  });

  test("applique la penalite configurable aux joueurs jamais ouverts", () => {
    const game = makeStartedGame(2);
    const winner = game.players[0];
    const other = game.players[1];
    setTurn(game, 0);
    winner.hand = [
      c("10", "hearts"),
      c("10", "spades"),
      c("10", "clubs"),
      c("K", "hearts"),
      c("K", "spades"),
      c("K", "clubs")
    ];
    other.hasOpened = false;
    other.hand = [c("A", "spades")];

    proposeTable(game, winner.id, [
      meld("tens", [c("10", "hearts"), c("10", "spades"), c("10", "clubs")]),
      meld("kings", [c("K", "hearts"), c("K", "spades"), c("K", "clubs")])
    ]);

    expect(other.score).toBe(100);
  });

  test("cumule les scores, conserve le cumul a la nouvelle manche et classe par score croissant", () => {
    const game = makeStartedGame(2);
    game.options.roundsToWin = 2;
    const winner = game.players[0];
    const other = game.players[1];
    setTurn(game, 0);
    winner.hand = [
      c("10", "hearts"),
      c("10", "spades"),
      c("10", "clubs"),
      c("K", "hearts"),
      c("K", "spades"),
      c("K", "clubs")
    ];
    other.hasOpened = true;
    other.hand = [c("10", "diamonds")];
    proposeTable(game, winner.id, [
      meld("tens", [c("10", "hearts"), c("10", "spades"), c("10", "clubs")]),
      meld("kings", [c("K", "hearts"), c("K", "spades"), c("K", "clubs")])
    ]);
    expect(other.score).toBe(10);

    const next = startRound(game);
    expect(next.ok).toBe(true);
    expect(other.score).toBe(10);
    expect(game.drawPile.length + game.players.flatMap((player) => player.hand).length).toBe(104);

    setTurn(game, 1);
    other.hand = [
      c("Q", "hearts"),
      c("Q", "spades"),
      c("Q", "clubs"),
      c("A", "hearts"),
      c("2", "hearts"),
      c("3", "hearts")
    ];
    winner.hasOpened = true;
    winner.hand = [c("K", "diamonds")];
    proposeTable(game, other.id, [
      meld("queens", [c("Q", "hearts"), c("Q", "spades"), c("Q", "clubs")]),
      meld("low", [c("A", "hearts"), c("2", "hearts"), c("3", "hearts")])
    ]);

    expect(game.status).toBe("game_over");
    expect(getRanking(game)[0].id).toBe(winner.id);
  });

  test("termine la manche sur pioche vide avec gagnant au moins de points et egalite possible", () => {
    const game = makeStartedGame(3);
    setTurn(game, 0);
    game.drawPile = [];
    game.players[0].hasOpened = true;
    game.players[1].hasOpened = true;
    game.players[2].hasOpened = true;
    game.players[0].hand = [c("2", "hearts")];
    game.players[1].hand = [c("2", "spades")];
    game.players[2].hand = [c("K", "clubs")];

    const result = finishRoundIfDrawPileEmpty(game, game.players[0].id);

    expect(result.ok).toBe(true);
    expect(game.status).toBe("round_finished");
    expect(game.roundResult?.reason).toBe("draw_pile_empty");
    expect(game.roundResult?.isTie).toBe(true);
    expect(game.roundResult?.winnerIds.sort()).toEqual([game.players[0].id, game.players[1].id].sort());
  });
});
