# 🪐 Razoonium — Règles du Jeu

Un jeu de **troc, de négociation et de trahison** pour **4 à 8 joueurs**, dans un dôme cyberpunk en pénurie. Chacun produit une seule ressource, et il en faut plusieurs pour marquer des points : il faut donc négocier. Aucune victoire coopérative n'est possible, il n'y a qu'**un seul vainqueur**.

---

## 🎯 1. Le But du Jeu

- La partie dure **10 jours** (10 tours) par défaut ; le créateur peut choisir de 5 à 30 tours.
- À la fin, le joueur qui possède **le plus de Razoonium** gagne.
- Le Razoonium s'obtient en **raffinant** la **Recette du Tour**. Une fois acquis, il est définitif et ne peut pas être volé.
- **Égalité** : le plus gros stock de ressources passe devant.

---

## ⚙️ 2. Rôles & Ressources

- Il y a **autant de ressources que de joueurs** (4 joueurs = 4 ressources, 8 joueurs = 8 ressources).
- Au lancement, chaque joueur reçoit au hasard un **rôle unique** qui produit **sa ressource attitrée** :

| Rôle | Ressource |
| :--- | :--- |
| Ferrailleur | Ferraille |
| Ingénieur plasma | Plasma |
| Botaniste | Spores |
| Netrunner | Données |
| Mineur | Cristaux |
| Hydrologue | Eau lourde |
| Médic | Biogel |
| Nanotechnicien | Nanites |

- **Production** : au début de chaque tour, chaque rôle produit **3 unités** de sa ressource.
- **Stock initial** : **1 unité de chaque ressource des autres rôles**.
- **Limite d'inventaire** : **12 ressources**. En fin de tour, le surplus est défaussé au Marché Noir (la ressource la plus abondante d'abord).
- **Les stocks sont publics** : chacun voit ce que les autres possèdent.

---

## 🧪 3. La Recette du Tour

- Une nouvelle recette est révélée au **début de chaque tour**. Elle ne revient jamais deux fois de suite.
- Elle demande **3 ressources différentes**, pour **4 à 5 ingrédients** au total (2 au plus de chaque).
- *Exemple :* `2 Plasma + 1 Spores + 1 Données = 1 Razoonium`.
- Comme la recette change à chaque tour, les alliances ne durent pas : il faut sans cesse changer de partenaires.

---

## 🤝 4. Le Troc (dons libres)

- Pendant le tour, tu peux **donner** à tout moment n'importe quelle quantité de tes ressources à un autre joueur.
- Le don est **immédiat et irréversible**, et **rien ne garantit la contrepartie** : promesses, échanges, chantage et trahisons se négocient sur le chat (ou sur Discord).
- Les dons ne sont visibles que du donneur et du receveur (mais les stocks, eux, sont publics).
- Les ressources déjà engagées au Marché Noir (ordre validé) ne peuvent pas être données.

---

## 🕶️ 5. Le Marché Noir

Ces actions sont des **ordres secrets**, exécutés à la fin du tour. Tu choisis toi-même **quelles ressources payer**.

1. **Pillage** : paie **3 ressources** pour voler **1 ressource au hasard** dans le stock d'un rival. Tu peux piller plusieurs fois, la même cible ou des cibles différentes. La victime sait qui l'a pillée.
2. **Loterie** : paie **2 ressources** pour piocher **1 ressource au hasard** dans la réserve du Marché Noir. Les ressources payées entrent dans la réserve **avant** le tirage : tu peux retomber sur ce que tu viens de sacrifier.

La **réserve du Marché Noir** commence avec 2 unités de chaque ressource. Elle se remplit avec les paiements du Marché Noir, les ingrédients raffinés et les surplus d'inventaire. Son contenu est public.

---

## 📑 6. Déroulement d'un Tour

Chaque tour dure un temps fixé à la création de la partie (**24h, 12h, 6h ou 1h**).

1. **Production & Recette** : la nouvelle recette est révélée, chaque rôle produit sa ressource.
2. **Négociation & Troc** : pendant toute la durée du tour, les joueurs négocient et se font des dons.
3. **Ordres secrets** : avant l'échéance, chacun indique ses **Pillages**, ses tirages de **Loterie**, leur **paiement**, et **combien de fois il veut raffiner**. Les ordres restent modifiables jusqu'à la résolution.
4. **Résolution** à l'échéance (ou dès que tout le monde a validé, si la *résolution anticipée* est activée) :
   1. Les paiements du Marché Noir rejoignent la réserve.
   2. Les **pillages** sont exécutés dans un ordre aléatoire.
   3. Les tirages de **Loterie** sont effectués.
   4. Le **Raffinage** : chacun raffine autant de fois qu'il l'a demandé, dans la limite de ce que son stock permet *après* le Marché Noir.
   5. La **limite d'inventaire** est appliquée.
5. **Fin de tour** : les scores sont mis à jour et un nouveau tour commence.

> ⚠️ Un paiement devenu impossible annule les Pillages et la Loterie du joueur (pas son Raffinage).

> 💡 Les ressources volées ou piochées arrivent **avant** le raffinage : un pillage réussi peut compléter ta recette.

Le **journal de bord** ne te montre que ce qui te concerne (tes dons, tes pillages donnés ou subis, ta loterie) ainsi que les événements publics (recette, raffinages de chacun).
