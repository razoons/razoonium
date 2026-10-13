# 🪐 Razoonium — Règles du Jeu

Un jeu de stratégie au tour par tour pour **4 à 8 joueurs**. Chaque joueur dirige un **dôme** alimenté par des **Batteries**. Chaque jour, tous les joueurs donnent leurs ordres en secret, puis le tour est résolu pour tout le monde en même temps.

---

## 🎯 1. Le But du Jeu

- La partie dure **15 jours** (15 tours) par défaut ; le créateur peut choisir de 5 à 30 tours.
- À la fin, le joueur qui possède **le plus de Razoonium** gagne.
- Les dômes encore allumés passent **toujours devant** les dômes éteints, quel que soit leur Razoonium.
- Si un seul dôme reste allumé avant la fin, la partie s'arrête immédiatement et ce joueur gagne.

### Classement
1. Dômes encore allumés d'abord.
2. Puis le plus de **Razoonium**.
3. En cas d'égalité : le plus de **Batteries**.
4. Entre dômes éteints : celui qui a tenu le plus longtemps passe devant.

---

## 🔋 2. Les Ressources

### Les Batteries
- **Stock initial** : **10 Batteries**.
- C'est la ressource que tu dépenses pour agir. Elle peut être **volée**.
- **Coût de vie** : à chaque tour, ton dôme consomme automatiquement **1 Batterie**.
- **Élimination** : si, à la fin d'un tour, tu as **0 Batterie ou moins**, ton dôme s'éteint. Tu ne joues plus, mais ton Razoonium reste compté au classement (derrière les dômes allumés).

> ⚠️ Si tu engages toutes tes Batteries, le coût de vie te fait passer à −1. Seuls tes gains du tour (Génération, Batteries d'attaque restituées, pillage) peuvent alors te sauver. Garde toujours une marge.

### Le Razoonium
- C'est **ton score**.
- On l'obtient en **raffinant** des Batteries (**3 Batteries → 1 Razoonium** ; le reliquat non raffinable t'est rendu) ou en **remportant un lot d'Enchère**.
- Il est **définitif** : il ne se dépense pas, ne se perd pas et **ne peut pas être volé**.
- Une Batterie raffinée ne peut plus servir à agir, survivre ou se défendre. Tout l'enjeu est de choisir **quand** transformer ta puissance en score.
- ⚠️ Le raffinage se fait **en fin de tour, après les attaques** : les Batteries misées en Raffinage **peuvent être pillées** (en dernier recours, après ta réserve et ta Génération). Seul ce qui reste de la mise est raffiné (3 Batteries → 1 Razoonium).

### La Réserve
Les Batteries que tu n'engages dans aucune action forment ta **réserve libre**. Elle paie le coût de vie et c'est **la première cible du pillage**.

---

## 📑 3. Le Tour de Jeu

- Chaque tour dure un temps fixé à la création de la partie (**24h, 12h, 6h ou 1h**).
- Avant l'échéance, tu répartis tes Batteries **en secret** entre les actions ci-dessous. Tu peux combiner plusieurs actions dans le même tour.
- Tu ne peux pas engager plus de Batteries que tu n'en possèdes.
- Tes ordres restent modifiables jusqu'à la résolution.
- Si l'option **résolution anticipée** est activée, le tour est résolu dès que tous les dômes allumés ont validé leurs ordres.
- Si tu n'as validé aucun ordre, ton dôme ne fait rien ce tour : toutes tes Batteries restent en réserve.

### Les 7 actions

| Action | Cible | Ce que deviennent les Batteries engagées |
| :--- | :--- | :--- |
| **Générer** | Soi-même | Consommées et remplacées par $X \times 3$ Batteries en fin de tour. |
| **Défendre** | Soi-même | Donnent $X$ dés de défense **ce tour** ; celles non prises te reviennent. |
| **Attaquer** | Un joueur | Donnent $X$ dés contre les dés de défense : chaque duel gagné prend 1 Bouclier, chaque duel perdu coûte 1 Batterie ; les dés en trop te reviennent et pillent autant. |
| **Protéger** | Un joueur | Donnent $X$ dés de défense **ce tour** à un autre dôme, lancés après les siens ; celles non prises te reviennent. |
| **Transférer** | Un joueur | Données à ce joueur, qui les reçoit **dans le tour** (avant les attaques). |
| **Enchère** | La réserve | Si tu gagnes un lot : mise payée, lot de Razoonium reçu. Sinon : mise remboursée. |
| **Raffiner** | Soi-même | Converties en Razoonium (3 pour 1) en fin de tour, après les attaques (la mise est pillable). |

---

## ⚛️ 4. Générer

- La mise est consommée et remplacée en fin de tour par $\lfloor \text{mise} \times \text{multiplicateur} \rfloor$ (arrondi à l'inférieur).
- Multiplicateur : **×3** par temps *Calme*.
- La Météo *Grisaille* le fait tomber à **×2**, la Météo *Abondance* le fait passer à **×4**.
- La mise en Génération **peut être pillée** (voir Attaque). Le rendement est calculé sur ce qu'il en reste après les attaques.

> **Exemple** : tu mets 6 en Génération. Sans attaque, tu récupères 6 × 3 = **18** (+12). Si un attaquant te pille 2 Batteries dans ta Génération, tu ne récupères que 4 × 3 = **12**.

---

## 🛡️ 5. Défendre

- Chaque Batterie en Défense te donne **1 dé de défense** pour ce tour.
- Le Bouclier ne dure que **le tour où il est posé**.
- Chaque dé de défense perdant fait perdre sa Batterie au profit de l'attaquant ; chaque dé gagnant te rapporte la Batterie de l'attaquant.
- Les Batteries de Bouclier non prises (dés gagnants ou non utilisés) **te reviennent** en fin de tour.
- Les Boucliers ne sont pas pillables.

---

## ⚔️ 6. Attaquer & Piller

Tu ne peux attaquer qu'**un seul joueur par tour**. Chaque Batterie d'attaque te donne **1 dé** (dés à 6 faces).

1. **Lancer** : attaquant et défenseur lancent leurs dés et les trient du plus fort au plus faible.
2. **Duels** : on compare les dés **un à un, dans l'ordre** (le meilleur contre le meilleur…), autant de fois que le camp qui a le moins de dés.
   - Dé d'attaque **strictement plus fort** : l'attaquant garde sa Batterie et **prend la Batterie de Bouclier**.
   - Sinon (**égalité comprise**) : le défenseur **prend la Batterie d'attaque**.
3. **Pillage** : chaque dé d'attaque **en trop** te rend sa Batterie et **vole 1 Batterie** à la cible, dans cet ordre :
   1. d'abord dans sa **réserve libre** (y compris les mises d'Enchère remboursées et les transferts reçus ce tour) ;
   2. puis dans sa **mise en Génération** ;
   3. puis dans sa **mise en Raffinage**.
4. On ne peut voler que ce que la cible possède : ses Boucliers, son Razoonium déjà acquis, ses mises d'Enchère gagnantes, ses attaques et ses transferts envoyés sont hors d'atteinte.

**Plusieurs attaquants sur la même cible** : tous leurs dés d'attaque sont triés ensemble face aux dés de défense. À dé égal, passe d'abord celui qui a lancé le plus de dés, puis celui qui a le moins de Batteries. Les dés en trop sont les plus faibles du lot.

> **Exemple** : tu attaques Nat avec **4**, Nat défend avec **2** et a une réserve libre de **3**.
> - Tes dés : 6 · 4 · 3 · 1. Ceux de Nat : 5 · 4.
> - 6 contre 5 : tu gagnes et prends 1 Batterie de Bouclier.
> - 4 contre 4 : égalité, Nat prend 1 de tes Batteries.
> - Tes 2 dés en trop (3 et 1) te reviennent et pillent 2 Batteries dans la réserve de Nat.
> - Tu termines le tour à **+6** pour 4 engagées (3 récupérées + 1 Bouclier + 2 pillées). Nat récupère 1 Bouclier et gagne 1 Batterie.

---

## 🤝 7. Protéger un autre dôme

- Tu peux envoyer des Batteries en **Bouclier sur un autre dôme** : chacune lui donne 1 dé de défense de plus, pour ce tour.
- Les dés du dôme attaqué sont comparés **en premier** (du plus fort au plus faible), puis ceux de ses protecteurs (chacun du plus fort au plus faible).
- Si un de tes dés perd son duel, l'attaquant **te prend** la Batterie. S'il gagne, c'est **toi** qui empoches la Batterie d'attaque.
- Les Batteries non prises (dés gagnants ou non utilisés) **te reviennent** en fin de tour, même si le dôme protégé n'est pas attaqué.
- Tu ne peux pas protéger le dôme que tu attaques. Tu peux te défendre et protéger quelqu'un dans le même tour.
- Plusieurs protecteurs : passe d'abord celui qui a envoyé le plus de Batteries, puis celui qui en possède le moins.

---

## ⇄ 8. Transférer

- Tu envoies $X$ Batteries à un autre joueur.
- Il les reçoit **pendant le tour, avant les attaques** : elles arrivent dans sa réserve libre et **peuvent donc être pillées** ce tour-ci.
- Tu ne peux transférer qu'à un seul joueur par tour.

---

## 🛒 9. L'Enchère quotidienne

- **Nombre de lots** : $\lfloor \text{joueurs encore en jeu} / 2 \rfloor$.
- **Contenu** : chaque lot contient une quantité aléatoire de **Razoonium** (de 2 à 8). Les lots du jour sont visibles par tous et triés du plus gros au plus petit.
- **Résolution** :
  1. Les joueurs sont classés par **mise décroissante**.
  2. Le 1ᵉʳ remporte le 1ᵉʳ lot, le 2ᵉ le 2ᵉ lot, etc.
  3. **Les gagnants paient leur mise** et le Razoonium du lot s'ajoute **directement à leur score** (imprenable).
  4. **Les perdants sont remboursés** : leur mise revient dans leur réserve libre, donc elle est pillable ce tour-ci.
  5. **Égalité de mise** : le joueur qui avait le moins de Batteries en début de tour passe devant.

> **Exemple** : lots du jour **6** et **3**. Tristan mise 4, Nat 2, Basto 2 (Nat a moins de Batteries que Basto).
> Tristan paie 4 et gagne 6 Razoonium. Nat paie 2 et gagne 3 Razoonium. Basto est remboursé de ses 2 Batteries.

---

## 🎲 10. La Météo

Un dé à 6 faces est lancé à chaque résolution. Personne ne connaît la météo au moment de donner ses ordres.

| Dé | Météo | Effet |
| :--- | :--- | :--- |
| 1 | **Grisaille** | Génération **×2** au lieu de ×3. |
| 2-5 | **Calme** | Génération **×3**. |
| 6 | **Abondance** | Génération **×4** au lieu de ×3. |

---

## ⚙️ 11. Ordre de Résolution d'un Tour

1. **Coût de vie** : −1 Batterie pour chaque dôme.
2. **Météo** : lancer du dé, qui fixe le multiplicateur de Génération.
3. **Enchères** : attribution des lots de Razoonium ; les mises perdantes reviennent dans la réserve.
4. **Transferts** : les Batteries transférées arrivent dans la réserve du destinataire.
5. **Protections** : les Boucliers envoyés rejoignent les dômes protégés.
6. **Attaques** : lancers de dés et duels, puis pillage par les dés en trop (réserve libre, puis Génération, puis Raffinage).
7. **Boucliers** : les Batteries de Bouclier non prises reviennent à leur propriétaire.
8. **Raffinage & Génération** : le Razoonium est crédité et le rendement de Génération calculé, chacun sur sa mise restante. Les Batteries gagnées et le butin sont ajoutés.
9. **Bilan** : tout dôme à 0 Batterie ou moins s'éteint.
