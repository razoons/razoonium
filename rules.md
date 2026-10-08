# 🪐 Razoonium — Règles du Jeu

Un jeu de stratégie tour par tour quotidien (24h) pour **4 à 8 joueurs**.

---

## 🎯 Le But du Jeu
Survivre **15 jours** (15 tours) ou être le dernier dôme debout. 
Le joueur qui possède **le plus de Batteries** à la fin du 15ᵉ jour emporte la partie.

---

## 🔋 1. La Ressource & La Survie

- **Stock initial** : Tous les joueurs commencent avec **10 Batteries**.
- **Coût de vie** : Chaque tour (24h), **1 Batterie est automatiquement consommée** par le dôme de chaque joueur.
- **Élimination** : Si tes Batteries tombent à **0**, ton dôme s'éteint et tu es **éliminé**.

---

## 📑 2. Le Tour de Jeu (Ordres Secrets)

Chaque jour, avant l'heure limite de résolution, tu répartis tes Batteries de manière **secrète** entre les 6 actions possibles :

| Action | Cible | Effet |
| :--- | :--- | :--- |
| **Générer** | Soi-même | Dépense $X$ Batteries $\rightarrow$ Rapporte $\lfloor X \times 1,5 \rfloor$ Batteries au tour suivant. |
| **Défendre** | Soi-même | Dépense $X$ Batteries $\rightarrow$ Crée $X$ points de Bouclier persistants pour **3 tours**. |
| **Attaquer** | Un joueur | Dépense $X$ Batteries $\rightarrow$ Casse la défense adverse et vole les Batteries en surplus. |
| **Pacte** | Un joueur | **Attaque et Défense interdites** ce tour. Si A et B se ciblent mutuellement $\rightarrow$ **Génération boostée ($\times 2$)**. |
| **Transférer** | Un joueur | Envoie $X$ Batteries à un autre joueur (il les reçoit au tour suivant). |
| **Enchère** | La réserve | Mise secrète de $X$ Batteries pour tenter de remporter un des Lots du jour. |

---

## ⚔️ 3. Détails des Combats & Alliances

### A. La Défense Persistante (3 Tours)
- **Durée** : Chaque Batterie jouée en Défense génère 1 point de Bouclier actif pendant 3 tours.
- **Attrition** : Chaque point de dégât subi détruit 1 point de Bouclier. Les Boucliers **les plus anciens sont détruits en priorité**.

### B. L'Attaque & Le Pillage Autofinancé
- **Casser la Défense** : Les Batteries d'attaque utilisées pour passer le Bouclier de la cible sont **définitivement perdues**.
- **Pillage (Dégâts nets)** : Toutes les Batteries d'attaque qui dépassent le Bouclier :
  1. Te sont **restituées** au tour suivant.
  2. **Volent 1 Batterie supplémentaire** à la cible : d'abord dans sa réserve libre, puis dans les Batteries qu'elle a misées en *Génération*. Les mises en Défense et en Enchère ne sont pas pillables.
- **Génération après l'attaque** : le rendement de la *Génération* est calculé sur la mise restante après pillage.
- **Attaques multiples** : Si plusieurs joueurs attaquent la même cible, les Boucliers sont entamés en commun et le pillage est réparti au prorata des dégâts nets.

### C. Le Pacte d'Alliance
- **Engagement** : Proposer un Pacte interdit d'**Attaquer** et de **Défendre** ce tour, que le Pacte soit réciproque ou non. Les Boucliers persistants existants restent actifs.
- **Condition** : Le Pacte est scellé uniquement si les deux joueurs se ciblent mutuellement avec l'action **Pacte**.
- **Bonus** : Rendement de la *Génération* doublé ($\times 2$) pour les deux alliés. Sans réciprocité, la Génération garde son rendement normal.

---

## 🛒 4. L'Enchère quotidienne (Les Lots)

- **Nombre de lots** : $\lfloor \text{Nombre de joueurs} / 2 \rfloor$ *(arrondi à l'inférieur)*.
- **Valeur des lots** : Quantités aléatoires de Batteries, visibles par tous et triées par ordre décroissant.
- **Résolution** :
  1. Les joueurs sont classés par leur **mise d'Enchère (ordre décroissant)**.
  2. Le 1ᵉʳ miseur emporte le 1ᵉʳ lot, le 2ᵉ emporte le 2ᵉ lot, etc.
  3. **Les gagnants paient leur mise**.
  4. **Les perdants récupèrent leur mise**.
  5. *Égalité* : Le joueur avec le moins de Batteries au total passe devant.

---

## 🎲 5. L'Aléa quotidien (La Météo)

Dé virtuel à 6 faces lancé à chaque résolution :

- **1-2 (Calme)** : Aucun effet.
- **3-4 (Tempête)** : Tous les dômes perdent **1 Batterie supplémentaire**.
- **5-6 (Abondance)** : Le rendement de la *Génération* classique passe à $\times 2$ (et le *Pacte* passe à $\times 2,5$).

---

## ⚙️ 6. Ordre de Résolution d'un Tour

1. **Paiement du coût de vie** (-1 Batterie par joueur).
2. **Tirage de la Météo**.
3. **Résolution des Enchères** (Attribution des lots et paiement des mises).
4. **Vérification des Pactes** (Réciprocité → bonus de Génération).
5. **Résolution des Attaques** (Destruction des boucliers anciens + Calcul du pillage, sur la réserve puis la mise en Génération).
6. **Mise à jour des Boucliers** (Expiration des boucliers de plus de 3 tours).
7. **Récoltes & Réceptions** (Gains de *Génération* sur la mise restante + *Batteries volées* + *Transferts*).