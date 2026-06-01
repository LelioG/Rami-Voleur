import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "kenney_playing-cards-pack", "PNG", "Cards (large)");
const target = path.join(root, "client", "public", "cards");

const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["A", "02", "03", "04", "05", "06", "07", "08", "09", "10", "J", "Q", "K"];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const suit of suits) {
  for (const rank of ranks) {
    const filename = `card_${suit}_${rank}.png`;
    await copyFile(path.join(source, filename), path.join(target, filename));
  }
}

await copyFile(path.join(source, "card_back.png"), path.join(target, "card_back.png"));

console.log(`Copied ${suits.length * ranks.length + 1} PNG card assets to ${path.relative(root, target)} without jokers.`);
