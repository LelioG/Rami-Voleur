# Rami voleur en ligne sans jokers et sans défausse

Application web multijoueur pour jouer au Rami voleur avec Socket.IO, React/Vite et un moteur de règles TypeScript partagé entre client, serveur et tests.

## Règles implémentées

- Version sans jokers uniquement.
- 2 jeux classiques de 52 cartes, soit 104 cartes physiques.
- Les deux exemplaires d'une même carte ont des ids différents, par exemple `deck1-hearts-7` et `deck2-hearts-7`.
- Aucune défausse: cette app n'implémente pas le rami classique à défausse.
- Première pose configurable, 40 points par défaut.
- Vol et réorganisation autorisés uniquement après la première pose.
- Toutes les combinaisons finales sur table doivent rester valides.
- Aucune carte seule, paire seule, carte dupliquée ou carte inconnue ne peut rester sur table.
- Un joueur qui réorganise le plateau doit jouer au moins une carte de sa main pendant le tour.
- À son tour, un joueur peut poser ou piocher.
- Piocher ajoute une carte depuis la pioche cachée et termine immédiatement le tour.
- Après une pose valide, le joueur finit son tour sans défausser.
- Le gagnant de manche prend 0 point, les autres prennent les points restants en main.
- Un joueur qui n'a jamais posé prend 100 points par défaut si l'option est activée.
- Le score cumulé classe les joueurs par total croissant.

## Règles du Rami voleur sans défausse

- 2 jeux de 52 cartes, soit 104 cartes.
- Aucun joker, aucune carte sauvage, aucun remplacement.
- Aucune défausse et aucune carte visible de défausse.
- Chaque joueur reçoit 13 cartes.
- Le reste forme une pioche face cachée.
- Le tour commence directement en phase d'action.
- Le joueur actif peut poser une ou plusieurs combinaisons valides, puis finir son tour.
- Le joueur actif peut aussi piocher une carte pour passer; la pioche termine alors son tour immédiatement.
- Première pose: 40 points minimum par défaut.
- Avant la première pose, pas de vol, pas de complément de combinaison existante et pas de réorganisation.
- Après la première pose, le joueur peut poser, compléter, voler ou réorganiser.
- Toute proposition de plateau est validée côté serveur.
- Le plateau officiel doit toujours contenir uniquement des combinaisons valides.
- La manche se termine dès qu'un joueur n'a plus de cartes.
- Si la pioche est vide et qu'un joueur passe au comptage, le plus petit total en main gagne la manche; une égalité est possible.

Cette application n'implémente pas le rami classique à défausse et n'implémente pas les jokers.

## Combinaisons

- Brelan ou carré: au moins 3 cartes du même rang, couleurs différentes, sans doublon rang + couleur.
- Suite: au moins 3 cartes consécutives de même couleur.
- `As-2-3` est autorisé.
- `Dame-Roi-As` est autorisé.
- `Roi-As-2` est interdit.

## Assets des cartes

Le dossier local `kenney_playing-cards-pack` a été inspecté. Il contient des PNG en trois tailles:

- `PNG/Cards (large)` en 64 x 64
- `PNG/Cards (medium)` en 32 x 32
- `PNG/Cards (small)` en 16 x 16

Le projet utilise les assets déjà inclus dans `client/public/cards` comme source officielle du build. Ce dossier contient uniquement les 52 cartes classiques et `card_back.png`. Les fichiers `card_joker_black.png` et `card_joker_red.png` ne sont pas inclus et ne sont jamais créés par le moteur.

Le script `npm run verify-assets` vérifie que `client/public/cards` contient exactement les PNG attendus, sans joker. Le script `npm run copy-assets` reste disponible uniquement pour régénérer ce dossier depuis `kenney_playing-cards-pack` si le pack source est présent localement.

Après vérification, `kenney_playing-cards-pack` peut être supprimé: `npm run dev`, `npm run build` et le déploiement Render ne dépendent plus de ce dossier.

La fonction `cardToAssetPath(card)` retourne des chemins publics du type:

```ts
/cards/card_hearts_07.png
```

## Structure

```text
client/   React + Vite
server/   Express + Socket.IO
shared/   Types, deck, règles, moteur de partie, tests
scripts/  Vérification des assets et copie manuelle optionnelle
```

## Design system

Le client utilise le **Rami Voleur Design System**.

Intention visuelle:

- direction artistique “club de cartes moderne”
- ambiance sombre, feutrée, premium et immersive
- tapis vert central avec profondeur, dorures discrètes et lumière douce
- accents dorés pour les actions principales, les états actifs et les moments importants
- typographie de marque élégante avec `Fraunces Variable`
- typographie d’interface lisible avec `Inter Variable`
- textes crème très lisibles sur fonds sombres
- cartes nettes, sélection visible, états hover/focus/disabled et micro-animations

Couleurs principales:

- fond: noir vert / bleu nuit très sombre
- table: vert feutre et vert profond
- surfaces: panneaux sombres translucides
- accent: doré
- succès: vert clair
- danger: rouge doux

Les tokens CSS sont centralisés dans:

```text
client/src/styles/tokens.css
```

Les styles applicatifs et responsive sont dans:

```text
client/src/styles/app.css
```

Les composants UI réutilisables sont dans:

```text
client/src/components/ui
client/src/components/game
```

Composants principaux:

- `Button`
- `Badge`
- `Panel`
- `CardView`
- `Input`
- `Select`
- `Modal`
- `Toast`
- `EmptyState`
- `SectionHeader`
- `PlayingCard`
- `PlayerSeat`
- `GameTable`
- `LobbyCard`
- `ScoreBoard`
- `ActionBar`
- `MeldGroup`
- `DrawPile`

Asset généré:

```text
client/public/brand/card-club-hero.png
```

Ce visuel sert de fond premium pour le hero, le lobby et l’ambiance de la table. Il a été généré localement via le skill `imagegen`, puis copié dans le projet.

Principes responsive:

- desktop: tableau central, scores latéraux, main en bas
- laptop/tablette: panneaux réorganisés en une colonne lisible
- mobile: main en scroll horizontal, actions empilées, boutons grands
- aucun débordement horizontal global volontaire

Principes d’accessibilité:

- focus-visible clair sur les boutons, champs et cartes sélectionnables
- contrastes élevés sur fonds sombres
- états non transmis uniquement par la couleur, avec labels et badges
- `aria-label` sur les actions importantes comme la pioche et la copie du code
- respect de `prefers-reduced-motion`

## Installation

```bash
npm install
npm run verify-assets
```

## Développement

```bash
npm run dev
```

Le client Vite démarre sur `http://localhost:5173` et le serveur sur `http://localhost:3000`.

## Tests

```bash
npm run test
```

Les tests couvrent le deck, la distribution, les combinaisons, la première pose, le vol, les tours, le scoring et l'état public sécurisé.

## Build

```bash
npm run build
```

Le build produit:

- `dist/client` pour l'application React
- `dist/server/index.js` pour le serveur Node

## Production

```bash
NODE_ENV=production npm start
```

En production, Express sert `dist/client` et Socket.IO fonctionne sur le même domaine.

## Déploiement Render

Créer un Web Service Render depuis ce dépôt.

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `NODE_ENV=production`
- `PORT` est fourni automatiquement par Render.

Les images de cartes sont incluses directement dans `client/public/cards`. Render n'a pas besoin du dossier `kenney_playing-cards-pack`; le build exécute seulement `npm run verify-assets` pour vérifier que les 52 cartes classiques et le dos sont présents, sans joker.

## Sécurité de jeu

Le serveur valide toutes les actions:

- tour courant
- phase du tour
- carte vraiment présente en main ou sur table
- absence de doublons
- absence de jokers
- validité complète du plateau proposé
- première pose avant vol ou réorganisation

`getPublicGameStateForPlayer(gameState, playerId)` retourne la main du joueur, son état d'ouverture, les combinaisons posées, les comptes de cartes adverses, le nombre de cartes dans la pioche, les scores, le joueur actif, la phase et l'historique public. Elle ne retourne jamais les mains adverses, l'ordre caché de la pioche, ni de champ de défausse.

## Limites connues

- Les salons sont stockés en mémoire. Un redémarrage serveur réinitialise les parties.
- La reconnexion par identité persistante n'est pas encore exposée côté client.
- Le déplacement des cartes se fait par sélection et boutons, pas par glisser-déposer.
