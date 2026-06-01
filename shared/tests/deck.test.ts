import { existsSync } from "node:fs";
import path from "node:path";
import { cardToAssetPath, createDeck, rankPoints } from "../src";

describe("deck", () => {
  test("cree 104 cartes sans joker avec ids uniques", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(104);
    expect(deck.some((card) => /joker/i.test(`${card.id} ${card.label} ${card.assetPath}`))).toBe(false);
    expect(new Set(deck.map((card) => card.id)).size).toBe(104);
  });

  test("distingue les deux jeux physiques", () => {
    const deck = createDeck();
    const heartSeven = deck.filter((card) => card.suit === "hearts" && card.rank === "7");
    expect(heartSeven).toHaveLength(2);
    expect(heartSeven.map((card) => card.id).sort()).toEqual(["deck1-hearts-7", "deck2-hearts-7"]);
    expect(heartSeven[0].assetPath).toBe(heartSeven[1].assetPath);
  });

  test("applique les valeurs de points", () => {
    expect(rankPoints("2")).toBe(2);
    expect(rankPoints("10")).toBe(10);
    expect(rankPoints("J")).toBe(10);
    expect(rankPoints("Q")).toBe(10);
    expect(rankPoints("K")).toBe(10);
    expect(rankPoints("A")).toBe(11);
  });

  test("mappe les cartes vers les PNG publics", () => {
    expect(cardToAssetPath({ suit: "hearts", rank: "7" })).toBe("/cards/card_hearts_07.png");
    expect(cardToAssetPath({ suit: "diamonds", rank: "A" })).toBe("/cards/card_diamonds_A.png");
    expect(cardToAssetPath({ suit: "spades", rank: "K" })).toBe("/cards/card_spades_K.png");
    expect(existsSync(path.resolve("client/public/cards/card_hearts_07.png"))).toBe(true);
  });
});
