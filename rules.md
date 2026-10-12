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
3. En cas d'égalité : le plus de **Batteries**, puis le plus de **Bouclier**.
4. Entre dômes éteints : celui qui a tenu le plus longtemps passe devant.

---

## 🔋 2. Les Ressources

### Les Batteries
- **Stock initial** : **10 Batteries**.
- C'est la ressource que tu dépenses pour agir. Elle peut être **volée**.
- **Coût de vie** : à chaque tour, ton dôme consomme automatiquement **1 Batterie**.
- **Élimination** : si, à la fin d'un tour, tu as **0 Batterie ou moins**, ton dôme s'éteint. Tu ne joues plus, mais ton Razoonium reste compté au classement (derrière les dômes allumés).

> ⚠️ Si tu engages toutes tes Batteries, le coût de vie te fait passer à −1. Seuls tes gains du tour (Génération, Batteries d'attaque restituées, pillage) peuvent alors te sauver. Garde toujours une marge, surtout en cas de Tempête (−1 de plus).

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
| **Défendre** | Soi-même | Transformées en $X$ points de Bouclier, actifs **3 tours**. |
| **Attaquer** | Un joueur | Celles qui cassent le Bouclier sont perdues ; les autres te reviennent et volent autant. |
| **Pacte** | Un joueur | Ne coûte rien. Interdit Attaque et Défense ce tour et rend tes Boucliers **inactifs** ; si réciproque, Génération ×5. |
| **Transférer** | Un joueur | Données à ce joueur, qui les reçoit **dans le tour** (avant les attaques). |
| **Enchère** | La réserve | Si tu gagnes un lot : mise payée, lot de Razoonium reçu. Sinon : mise remboursée. |
| **Raffiner** | Soi-même | Converties en Razoonium (3 pour 1) en fin de tour, après les attaques (la mise est pillable). |

---

## ⚛️ 4. Générer

- La mise est consommée et remplacée en fin de tour par $\lfloor \text{mise} \times \text{multiplicateur} \rfloor$ (arrondi à l'inférieur).
- Multiplicateur : **×3** normalement, **×5** avec un Pacte scellé.
- La Météo *Abondance* le fait passer à **×4** (et à **×6** avec un Pacte scellé).
- La mise en Génération **peut être pillée** (voir Attaque). Le rendement est calculé sur ce qu'il en reste après les attaques.

> **Exemple** : tu mets 6 en Génération. Sans attaque, tu récupères 6 × 3 = **18** (+12). Si un attaquant te pille 2 Batteries dans ta Génération, tu ne récupères que 4 × 3 = **12**.

---

## 🛡️ 5. Défendre

- Chaque Batterie en Défense crée **1 point de Bouclier**.
- Un Bouclier posé le jour J est **actif dès ce tour** et protège pendant les tours J, J+1 et J+2, puis il expire.
- Chaque point de dégât détruit 1 point de Bouclier. Les Boucliers **les plus anciens sont détruits en premier**.
- Les Boucliers ne sont pas pillables.

---

## ⚔️ 6. Attaquer & Piller

Tu ne peux attaquer qu'**un seul joueur par tour**. Quand tu l'attaques avec $X$ Batteries :

1. **Casser le Bouclier** : les Batteries qui servent à détruire le Bouclier de la cible sont **perdues**.
2. **Dégâts nets** : les Batteries qui dépassent le Bouclier te sont **restituées** en fin de tour.
3. **Pillage** : chaque Batterie de dégâts nets **vole 1 Batterie** à la cible, dans cet ordre :
   1. d'abord dans sa **réserve libre** (y compris les mises d'Enchère remboursées et les transferts reçus ce tour) ;
   2. puis dans sa **mise en Génération** ;
   3. puis dans sa **mise en Raffinage**.
4. On ne peut voler que ce que la cible possède : ses Boucliers, son Razoonium déjà acquis, ses mises d'Enchère gagnantes, ses attaques et ses transferts envoyés sont hors d'atteinte.

**Plusieurs attaquants sur la même cible** : leurs attaques s'additionnent pour casser le Bouclier. Les dégâts nets et le butin sont ensuite répartis au **prorata** de la mise de chacun.

> **Exemple** : tu attaques Nat avec **7**. Nat a un Bouclier de **3**, une réserve libre de **2** et **5** en Génération.
> - 3 de tes Batteries cassent son Bouclier et sont perdues.
> - Les 4 restantes te reviennent et volent 4 Batteries : 2 dans sa réserve, puis 2 dans sa Génération.
> - Tu termines le tour avec **+8** (4 restituées + 4 volées) pour 7 engagées.
> - Nat génère sur les 3 qui restent : 3 × 3 = 9 au lieu de 15.

---

## 🤝 7. Le Pacte

- Proposer un Pacte à un joueur **ne coûte aucune Batterie**. On ne peut proposer qu'un seul Pacte par tour.
- **Engagement** : que le Pacte soit accepté ou non, tu **ne peux ni Attaquer ni Défendre** ce tour.
- **Exposition** : pendant ce tour, **tes Boucliers sont inactifs**. Toute attaque contre toi pille directement ta réserve puis ta Génération, sans rien casser. Tes Boucliers ne sont pas abîmés et redeviennent actifs au tour suivant.
- **Pacte scellé** : uniquement si les deux joueurs se proposent mutuellement le Pacte (A → B et B → A). Les deux alliés ont alors une Génération **×5** (×6 en Abondance).
- **Pacte non réciproque** : pas de bonus, mais l'engagement et l'exposition s'appliquent quand même.

> **Trahison** : proposer un Pacte, c'est se mettre à nu. Ton « allié » peut ne pas jouer le Pacte et t'attaquer, ou prévenir un troisième joueur et partager le butin avec lui par Transfert.

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
| 1-2 | **Calme** | Aucun effet. |
| 3-4 | **Tempête** | Tous les dômes perdent **1 Batterie supplémentaire**. |
| 5-6 | **Abondance** | Génération **×4** au lieu de ×3 ; Pacte scellé **×6** au lieu de ×5. |

---

## ⚙️ 11. Ordre de Résolution d'un Tour

1. **Coût de vie** : −1 Batterie pour chaque dôme.
2. **Météo** : lancer du dé (et −1 Batterie de plus en cas de Tempête).
3. **Pactes** : vérification de la réciprocité. Les attaques et défenses de ceux qui ont proposé un Pacte sont annulées, et leurs Boucliers sont inactifs pour ce tour.
4. **Boucliers** : les nouveaux Boucliers sont posés (actifs immédiatement).
5. **Enchères** : attribution des lots de Razoonium ; les mises perdantes reviennent dans la réserve.
6. **Transferts** : les Batteries transférées arrivent dans la réserve du destinataire.
7. **Attaques** : destruction des Boucliers (les plus anciens d'abord), puis pillage de la réserve libre, puis de la Génération, puis du Raffinage.
8. **Expiration des Boucliers** posés il y a 3 tours.
9. **Raffinage & Génération** : le Razoonium est crédité et le rendement de Génération calculé, chacun sur sa mise restante. Les Batteries d'attaque restituées et le butin sont ajoutés.
10. **Bilan** : tout dôme à 0 Batterie ou moins s'éteint.
