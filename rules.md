# 🪐 Razoonium — Règles du Jeu

Un jeu de stratégie au tour par tour pour **4 à 8 joueurs**. Chaque joueur dirige un **dôme** alimenté par des **Batteries**. Chaque jour, tous les joueurs donnent leurs ordres en secret, puis le tour est résolu pour tout le monde en même temps.

---

## 🎯 1. Le But du Jeu

- La partie dure **15 jours** (15 tours) par défaut ; le créateur peut choisir de 5 à 30 tours.
- À la fin, le joueur qui possède **le plus de Razoonium** gagne.
- Un dôme éteint reste classé **selon son Razoonium**, comme les autres : s'éteindre arrête ta progression, pas ton score.
- Si un seul dôme reste allumé avant la fin, la partie s'arrête immédiatement ; le classement se fait alors au Razoonium.

### Classement
1. Le plus de **Razoonium**, dômes éteints compris.
2. En cas d'égalité : un dôme encore allumé passe devant un dôme éteint.
3. Puis le plus de **Batteries**.
4. Entre dômes éteints : celui qui a tenu le plus longtemps passe devant.

---

## 🔋 2. Les Ressources

### Les Batteries
- **Stock initial** : **10 Batteries**.
- C'est la ressource que tu dépenses pour agir. Elle peut être **volée**.
- **Coût de vie** : à chaque tour, ton dôme consomme automatiquement **1 Batterie**.
- **Élimination** : si, à la fin d'un tour, tu as **0 Batterie ou moins**, ton dôme s'éteint. Tu ne joues plus, mais ton Razoonium reste compté au classement.

> ⚠️ Si tu engages toutes tes Batteries, le coût de vie te fait passer à −1. Seuls tes gains du tour (Génération, Batteries d'attaque restituées, pillage) peuvent alors te sauver. Garde toujours une marge.

### Le Razoonium
- C'est **ton score**.
- On l'obtient en **raffinant** des Batteries (**3 Batteries → 1 Razoonium** ; le reliquat non raffinable t'est rendu) ou en **remportant un lot d'Enchère**.
- Il est **définitif** : il ne se dépense pas, ne se perd pas et **ne peut pas être volé**.
- Une Batterie raffinée ne peut plus servir à agir, survivre ou se défendre. Tout l'enjeu est de choisir **quand** transformer ta puissance en score.
- ⚠️ Le raffinage se fait **en fin de tour, après les attaques** : les Batteries misées en Raffinage **peuvent être pillées** (en dernier recours, après ta Génération et ta réserve). Seul ce qui reste de la mise est raffiné (3 Batteries → 1 Razoonium).

### La Réserve
Les Batteries que tu n'engages dans aucune action forment ta **réserve libre**. Elle paie le coût de vie et elle est pillée **juste après ta mise en Génération**.

---

## 📑 3. Le Tour de Jeu

- Chaque tour dure un temps fixé à la création de la partie (**24h, 12h, 6h ou 1h**).
- Avant l'échéance, tu répartis tes Batteries **en secret** entre les actions ci-dessous. Tu peux combiner plusieurs actions dans le même tour.
- Tu ne peux pas engager plus de Batteries que tu n'en possèdes.
- Tes ordres restent modifiables jusqu'à la résolution.
- Si l'option **résolution anticipée** est activée, le tour est résolu dès que tous les dômes allumés ont validé leurs ordres.
- Si tu n'as validé aucun ordre, ton dôme ne fait rien ce tour : toutes tes Batteries restent en réserve.
- Le **journal de bord** ne te montre que ce qui te concerne (tes actions, les attaques que tu donnes ou reçois, tes enchères) ainsi que les événements publics (météo, lots révélés, dômes éteints, bilan des Batteries de chacun). Les Batteries et le Razoonium de tous les dômes sont publics ; les boucliers et les ordres des autres restent secrets.

### Les 6 actions

| Action | Cible | Ce que deviennent les Batteries engagées |
| :--- | :--- | :--- |
| **Générer** | Soi-même | Consommées et remplacées par $X \times 2$ Batteries en fin de tour (×1,5 ou ×3 selon la météo). Pillées en premier. |
| **Défendre** | Soi-même | Donnent $X$ dés de défense **ce tour**, puis sont **consommées**, même sans attaque. |
| **Attaquer** | Un joueur | Donnent $X$ dés contre les dés de défense : chaque duel gagné prend 1 Bouclier, chaque duel perdu coûte 1 Batterie ; chaque dé en trop te revient et **pille 2 Batteries**. |
| **Transférer** | Un joueur | Données à ce joueur, qui les reçoit **dans le tour** (avant les attaques). |
| **Enchère** | La réserve | Mise secrète **payée par tous**. Les plus grosses mises remportent les lots, dont le contenu reste caché jusqu'à la résolution. |
| **Raffiner** | Soi-même | Converties en Razoonium (3 pour 1) en fin de tour, après les attaques (la mise est pillable). |

---

## ⚛️ 4. Générer

- La mise est consommée et remplacée en fin de tour par $\lfloor \text{mise} \times \text{multiplicateur} \rfloor$ (arrondi à l'inférieur).
- Multiplicateur : **×2** par temps *Calme*.
- La Météo *Grisaille* le fait tomber à **×1,5**, la Météo *Abondance* le fait passer à **×3**.
- Il n'y a pas de plafond : tu peux mettre tout ce que tu veux en Génération.
- Mais la mise en Génération est **la première pillée** (voir Attaque). Le rendement est calculé sur ce qu'il en reste après les attaques. Plus tu génères, plus tu es une cible.

> **Exemple** : tu mets 10 en Génération. Sans attaque, tu récupères 10 × 2 = **20** (+10). Si un attaquant te pille 4 Batteries dans ta Génération, tu ne récupères que 6 × 2 = **12**.

---

## 🛡️ 5. Défendre

- Chaque Batterie en Défense te donne **1 dé de défense** pour ce tour.
- Le Bouclier ne dure que **le tour où il est posé**.
- Chaque dé de défense perdant donne sa Batterie à l'attaquant ; chaque dé gagnant te rapporte la Batterie de l'attaquant.
- Les Batteries de Bouclier sont **consommées** en fin de tour, qu'elles aient servi ou non : se protéger a toujours un coût.
- Les Boucliers ne sont pas pillables.

> **Le dilemme** : chaque Batterie mise en Défense ne génère rien et disparaît. Tu génères à fond en restant exposé, ou tu génères moins pour te protéger ?

---

## ⚔️ 6. Attaquer & Piller

Tu ne peux attaquer qu'**un seul joueur par tour**. Chaque Batterie d'attaque te donne **1 dé** (dés à 6 faces).

1. **Lancer** : attaquant et défenseur lancent leurs dés et les trient du plus fort au plus faible.
2. **Duels** : on compare les dés **un à un, dans l'ordre** (le meilleur contre le meilleur…), autant de fois que le camp qui a le moins de dés.
   - Dé d'attaque **strictement plus fort** : l'attaquant garde sa Batterie et **prend la Batterie de Bouclier**.
   - Sinon (**égalité comprise**) : le défenseur **prend la Batterie d'attaque**.
3. **Pillage** : chaque dé d'attaque **en trop** te rend sa Batterie et **vole 2 Batteries** à la cible, dans cet ordre :
   1. d'abord dans sa **mise en Génération** ;
   2. puis dans sa **réserve libre** (y compris les transferts reçus ce tour) ;
   3. puis dans sa **mise en Raffinage**.
4. On ne peut voler que ce que la cible possède : ses Boucliers, son Razoonium déjà acquis, ses mises d'Enchère, ses attaques et ses transferts envoyés sont hors d'atteinte.

**Plusieurs attaquants sur la même cible** : tous leurs dés d'attaque sont triés ensemble face aux dés de défense. À dé égal, passe d'abord celui qui a lancé le plus de dés, puis celui qui a le moins de Batteries. Les dés en trop sont les plus faibles du lot.

> **Exemple** : tu attaques Nat avec **4**, Nat défend avec **2**, a **3** en Génération et une réserve libre de **3**.
> - Tes dés : 6 · 4 · 3 · 1. Ceux de Nat : 5 · 4.
> - 6 contre 5 : tu gagnes et prends 1 Batterie de Bouclier.
> - 4 contre 4 : égalité, Nat prend 1 de tes Batteries.
> - Tes 2 dés en trop (3 et 1) te reviennent et pillent 4 Batteries : les 3 de la Génération de Nat, puis 1 dans sa réserve.
> - Tu termines le tour à **+8** pour 4 engagées (3 récupérées + 1 Bouclier + 4 pillées). Nat gagne 1 Batterie, perd ses 2 Batteries de Bouclier et ne génère rien.

---

## ⇄ 7. Transférer

- Tu envoies $X$ Batteries à un autre joueur.
- Il les reçoit **pendant le tour, avant les attaques** : elles arrivent dans sa réserve libre et **peuvent donc être pillées** ce tour-ci.
- Tu ne peux transférer qu'à un seul joueur par tour.

---

## 🛒 8. L'Enchère quotidienne

- **Nombre de lots** : $\lfloor \text{joueurs encore en jeu} / 2 \rfloor$.
- **Contenu** : chaque lot contient une quantité aléatoire de **Razoonium** (de 0 à 4). On connaît le nombre de lots, mais leur contenu reste **caché jusqu'à la résolution**. Les lots sont triés du plus gros au plus petit.
- **Résolution** :
  1. **Tout le monde paie sa mise**, gagnant ou perdant.
  2. Les joueurs sont classés par **mise décroissante**.
  3. Le 1ᵉʳ remporte le 1ᵉʳ lot (le plus gros), le 2ᵉ le 2ᵉ lot, etc. Le Razoonium du lot s'ajoute **directement au score** (imprenable).
  4. **Égalité de mise** : le joueur qui avait le moins de Batteries en début de tour passe devant.

> **Quitte ou double** : 1 Razoonium vaut 3 Batteries au raffinage. Miser 4 pour un lot de 4, c'est l'équivalent de 12 Batteries ; pour un lot de 0, ou si on te passe devant, tu perds tout.

> **Exemple** : 2 lots, révélés à la résolution : **3** et **0**. Tristan mise 4, Nat 2, Basto 2 (Nat a moins de Batteries que Basto).
> Tristan paie 4 et gagne 3 Razoonium. Nat paie 2 et ne gagne rien (lot vide). Basto paie 2 et ne gagne rien.

---

## 🎲 9. La Météo

Un dé à 6 faces est lancé à chaque résolution. Personne ne connaît la météo au moment de donner ses ordres.

| Dé | Météo | Effet |
| :--- | :--- | :--- |
| 1 | **Grisaille** | Génération **×1,5** au lieu de ×2. |
| 2-5 | **Calme** | Génération **×2**. |
| 6 | **Abondance** | Génération **×3** au lieu de ×2. |

---

## ⚙️ 10. Ordre de Résolution d'un Tour

1. **Coût de vie** : −1 Batterie pour chaque dôme.
2. **Météo** : lancer du dé, qui fixe le multiplicateur de Génération.
3. **Enchères** : toutes les mises sont payées, les lots sont révélés et attribués.
4. **Transferts** : les Batteries transférées arrivent dans la réserve du destinataire.
5. **Attaques** : lancers de dés et duels, puis pillage par les dés en trop, 2 Batteries chacun (Génération, puis réserve libre, puis Raffinage).
6. **Boucliers** : les Batteries de Bouclier restantes sont consommées.
7. **Raffinage & Génération** : le Razoonium est crédité et le rendement de Génération calculé, chacun sur sa mise restante. Les Batteries gagnées et le butin sont ajoutés.
8. **Bilan** : tout dôme à 0 Batterie ou moins s'éteint.
