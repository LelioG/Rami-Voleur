import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "client", "public", "cards");

const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["A", "02", "03", "04", "05", "06", "07", "08", "09", "10", "J", "Q", "K"];

const requiredFiles = new Set(["card_back.png"]);

for (const suit of suits) {
  for (const rank of ranks) {
    requiredFiles.add(`card_${suit}_${rank}.png`);
  }
}

let files;
try {
  files = await readdir(target);
} catch {
  console.error("Missing card assets directory: client/public/cards");
  console.error("Restore the committed assets or run npm run copy-assets with kenney_playing-cards-pack available.");
  process.exit(1);
}

const pngFiles = files.filter((file) => file.endsWith(".png"));
const missingFiles = [...requiredFiles].filter((file) => !files.includes(file));
const extraPngFiles = pngFiles.filter((file) => !requiredFiles.has(file));
const jokerFiles = files.filter((file) => /joker/i.test(file));

if (missingFiles.length > 0 || extraPngFiles.length > 0 || jokerFiles.length > 0) {
  if (missingFiles.length > 0) {
    console.error(`Missing required card assets:\n${missingFiles.map((file) => `- ${file}`).join("\n")}`);
  }

  if (extraPngFiles.length > 0) {
    console.error(`Unexpected PNG files in client/public/cards:\n${extraPngFiles.map((file) => `- ${file}`).join("\n")}`);
  }

  if (jokerFiles.length > 0) {
    console.error(`Joker assets are forbidden:\n${jokerFiles.map((file) => `- ${file}`).join("\n")}`);
  }

  process.exit(1);
}

console.log(`Verified ${requiredFiles.size} card assets in client/public/cards without jokers.`);
