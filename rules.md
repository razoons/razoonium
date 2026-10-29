# 🏰 Spécifications Techniques et Règles : "Le Château des Ténèbres"

Document de spécifications pour le développement de l'application (Jeu de traître / Déduction sociale / Tour par tour).

---

## 🎲 1. Concept Général & Rôles

* **Nombre de joueurs :** 4 à 10 joueurs.
* **Durée / Structure :** Parties découpées en **manches** (tours de table).
* **Rôles :**
  * **1 Tueur** (désigné secrètement au début par l'application).
  * **N-1 Survivants**.
* **Points de Vie (PV) :** Chaque joueur commence avec **3 PV**.

### Conditions de Victoire
* **Victoire des Survivants :** Le Tueur atteint 0 PV (il meurt).
* **Victoire du Tueur :** Le Tueur est le dernier joueur en vie (ou tous les survivants sont morts).

---

## 🗺️ 2. Carte & Perception (Salles et Visibilité)

La carte du jeu est un graphe de salles adjacentes (ex: *Grande Salle, Cachots, Cuisine, Remparts, Bibliothèque, etc.*).

### Règles de Perception
1. **Dans la salle actuelle :**
   * Un joueur voit la liste de tous les joueurs **visibles** présents avec lui.
   * **Absence d'indices pour les cachés :** Un joueur ayant exécuté l'action "Se cacher" est **totalement invisible**. Si tous les joueurs d'une salle sont cachés, la salle apparaît comme strictement vide. Aucun indice visuel ou textuel n'indique leur présence.
2. **Dans les salles adjacentes (Acoustique) :**
   * L'interface indique si des bruits/mouvements ont lieu dans les salles connectées (déplacements, attaques).
3. **Attaques :** anonymes pour la victime et les présents visibles (ils n'entendent qu'un cri). Un joueur **caché** dans la salle voit qui frappe qui (sauf pendant un Blackout).
4. **Les morts :** le fantôme d'un mort erre librement de salle en salle, invisible, et perçoit ce qu'un vivant y verrait. Il peut, une seule fois, **demander à tout voir** : si le Tueur accepte, il voit tout (identité du Tueur, positions de tous, cachés compris, déplacements, attaques) ; sinon il ne peut qu'errer. Les morts ne parlent pas.

---

## 🔄 3. Déroulement d'une Manche (Cycle de Jeu)

Chaque manche se décompose en 3 phases distinctes :

### Phase 1 : Détermination de l'Ordre de Passage
1. **Choix Secret du Tueur :** En premier lieu, le Tueur choisit la position exacte dans laquelle il souhaite agir pour la manche à venir (ex: 1er, 4e, dernier, etc.).
2. **Tirage Aléatoire pour les autres :** L'application attribue aléatoirement les positions restantes aux Survivants.
3. **Secret de l'ordre :** Chaque joueur connaît uniquement **sa propre position** dans le tour. Il ne connaît pas l'ordre des autres joueurs.

### Phase 2 : Phase d'Actions (Tour par Tour)
Les joueurs exécutent leur tour les uns après les autres, selon l'ordre déterminé. À son tour, un joueur choisit **une seule** des 4 options d'action suivantes :

1. `SE_CACHER`
   * Le joueur reste dans sa salle actuelle et passe en état **Caché** (invisible pour tous les joueurs qui entreraient ou seraient déjà dans la salle).
2. `DEPLACER_PUIS_SE_CACHER`
   * Le joueur se déplace vers une salle adjacente.
   * Il termine son mouvement en état **Caché**.
3. `DEPLACER_PUIS_ATTAQUER`
   * Le joueur se déplace vers une salle adjacente.
   * Il porte un coup (inflige 1 PV de dégât) à un joueur **visible** présent dans la nouvelle salle (ou s'inflige 1 PV à lui-même pour bluffer).
4. `ATTAQUER_PUIS_DEPLACER`
   * Le joueur porte un coup (1 PV de dégât) à un joueur **visible** dans sa salle actuelle (ou à lui-même).
   * Il se déplace ensuite immédiatement vers une salle adjacente.

---

## 🃏 4. Pouvoir Spécial du Tueur : Le Blackout

* **Fréquence :** 1 fois par partie.
* **Déclenchement :** Le Tueur peut choisir d'activer son Joker "Blackout" au début d'une manche.
* **Effet :** 
  * Le courant est coupé dans tout le château pour l'ensemble de la manche.
  * La visibilité est annulée : **aucun joueur ne voit qui se trouve dans la même salle**, que les joueurs soient cachés ou non.
  * Les déplacements et attaques s'effectuent à l'aveugle.

---

## 💬 5. Bilan de fin de manche

* À la fin de chaque manche (quand tous les joueurs vivants ont joué), l'application affiche un bilan partiel (joueurs blessés, cadavres découverts) et notifie tout le monde ; la manche suivante commence aussitôt.
* Le débat (confronter les indices, accuser, mentir) se tient **hors de l'application**, sur WhatsApp. Il n'y a pas de tchat en partie.

---

## 💻 6. Structure de Données Suggérée (Pour le Dev)

```json
{
  "gameState": {
    "gameId": "string",
    "status": "LOBBY | IN_PROGRESS | FINISHED",
    "currentRound": "number",
    "blackoutActive": "boolean",
    "tueurId": "string"
  },
  "player": {
    "id": "string",
    "name": "string",
    "role": "SURVIVANT | TUEUR",
    "pv": 3,
    "currentRoom": "string",
    "isHidden": "boolean",
    "turnOrder": "number",
    "isAlive": "boolean"
  },
  "room": {
    "id": "string",
    "name": "string",
    "adjacentRoomIds": ["string"]
  }
}
```