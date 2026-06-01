import { drawCardAndPass, endTurn, proposeTable } from "../src";
import { c, makeStartedGame, meld, setTurn } from "./helpers";

describe("tour de jeu sans defausse", () => {
  test("un nouveau tour commence en action_phase", () => {
    const game = makeStartedGame(2);
    expect(game.phase).toBe("action_phase");
    expect(game.turnHasPlay).toBe(false);
  });

  test("piocher ajoute une carte, termine le tour et passe au joueur suivant", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    const initialHand = player.hand.length;
    const initialPile = game.drawPile.length;
    setTurn(game, 0);

    const result = drawCardAndPass(game, player.id);

    expect(result.ok).toBe(true);
    expect(player.hand).toHaveLength(initialHand + 1);
    expect(game.drawPile).toHaveLength(initialPile - 1);
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.phase).toBe("action_phase");
    expect(game.turnHasPlay).toBe(false);
  });

  test("piocher est possible pour un joueur ferme qui ne peut pas poser", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game, 0);
    player.hasOpened = false;
    player.hand = [c("2", "hearts"), c("5", "clubs"), c("9", "spades")];

    const result = drawCardAndPass(game, player.id);

    expect(result.ok).toBe(true);
    expect(game.currentPlayerIndex).toBe(1);
  });

  test("interdit de piocher hors tour ou si la pioche est vide", () => {
    const game = makeStartedGame(2);
    setTurn(game, 0);
    expect(drawCardAndPass(game, game.players[1].id).ok).toBe(false);

    game.drawPile = [];
    expect(drawCardAndPass(game, game.players[0].id).ok).toBe(false);
  });

  test("finir le tour est possible apres une pose valide et impossible sans pose", () => {
    const game = makeStartedGame(2);
    const player = game.players[0];
    setTurn(game, 0);

    expect(endTurn(game, player.id).ok).toBe(false);

    player.hand = [
      c("10", "hearts"),
      c("10", "spades"),
      c("10", "clubs"),
      c("K", "hearts"),
      c("K", "spades"),
      c("K", "clubs"),
      c("2", "diamonds")
    ];
    const pose = proposeTable(game, player.id, [
      meld("tens", [c("10", "hearts"), c("10", "spades"), c("10", "clubs")]),
      meld("kings", [c("K", "hearts"), c("K", "spades"), c("K", "clubs")])
    ]);
    expect(pose.ok).toBe(true);
    expect(game.turnHasPlay).toBe(true);

    const ended = endTurn(game, player.id);
    expect(ended.ok).toBe(true);
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.phase).toBe("action_phase");
    expect(game.turnHasPlay).toBe(false);
    expect(game.players[0].hand.map((card) => card.id)).toEqual([c("2", "diamonds").id]);
  });
});
