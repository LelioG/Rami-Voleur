import { validateMeld } from "../src";
import { c } from "./helpers";

describe("combinaisons", () => {
  test("accepte brelan et carre de meme rang avec couleurs differentes", () => {
    expect(validateMeld([c("7", "hearts"), c("7", "spades"), c("7", "clubs")]).valid).toBe(true);
    expect(validateMeld([c("7", "hearts"), c("7", "spades"), c("7", "clubs"), c("7", "diamonds")]).valid).toBe(true);
    expect(validateMeld([c("A", "hearts"), c("A", "spades"), c("A", "clubs")]).valid).toBe(true);
  });

  test("refuse deux cartes et doublon meme rang meme couleur", () => {
    expect(validateMeld([c("7", "hearts"), c("7", "spades")]).valid).toBe(false);
    expect(validateMeld([c("7", "hearts", 1), c("7", "hearts", 2), c("7", "spades")]).valid).toBe(false);
    expect(validateMeld([c("A", "hearts", 1), c("A", "hearts", 2), c("A", "spades")]).valid).toBe(false);
  });

  test("accepte les suites classiques", () => {
    expect(validateMeld([c("5", "hearts"), c("6", "hearts"), c("7", "hearts")]).valid).toBe(true);
  });

  test("accepte As bas et As haut uniquement aux extremites", () => {
    expect(validateMeld([c("A", "clubs"), c("2", "clubs"), c("3", "clubs")]).valid).toBe(true);
    expect(validateMeld([c("A", "spades"), c("2", "spades"), c("3", "spades"), c("4", "spades")]).valid).toBe(true);
    expect(validateMeld([c("Q", "diamonds"), c("K", "diamonds"), c("A", "diamonds")]).valid).toBe(true);
    expect(validateMeld([c("J", "diamonds"), c("Q", "diamonds"), c("K", "diamonds"), c("A", "diamonds")]).valid).toBe(true);
    expect(validateMeld([c("10", "clubs"), c("J", "clubs"), c("Q", "clubs"), c("K", "clubs"), c("A", "clubs")]).valid).toBe(true);
  });

  test("refuse les suites circulaires et les As/rangs dupliques dans une suite", () => {
    expect(validateMeld([c("K", "spades"), c("A", "spades"), c("2", "spades")]).valid).toBe(false);
    expect(validateMeld([c("Q", "hearts"), c("K", "hearts"), c("A", "hearts"), c("2", "hearts")]).valid).toBe(false);
    expect(validateMeld([c("K", "hearts"), c("A", "hearts"), c("2", "hearts"), c("3", "hearts")]).valid).toBe(false);
    expect(validateMeld([c("2", "hearts"), c("A", "hearts"), c("K", "hearts")]).valid).toBe(false);
    expect(validateMeld([c("A", "hearts", 1), c("A", "hearts", 2), c("K", "hearts")]).valid).toBe(false);
    expect(validateMeld([c("A", "hearts", 1), c("A", "hearts", 2), c("2", "hearts")]).valid).toBe(false);
    expect(validateMeld([c("5", "hearts", 1), c("5", "hearts", 2), c("6", "hearts")]).valid).toBe(false);
  });

  test("refuse suites de couleurs differentes", () => {
    expect(validateMeld([c("5", "hearts"), c("6", "spades"), c("7", "hearts")]).valid).toBe(false);
  });

  test("refuse toute combinaison contenant un joker", () => {
    const fakeJoker = {
      ...c("A", "hearts"),
      id: "joker-red",
      label: "Joker rouge",
      assetPath: "/cards/card_joker_red.png"
    };
    expect(validateMeld([fakeJoker, c("2", "hearts"), c("3", "hearts")]).valid).toBe(false);
  });
});
