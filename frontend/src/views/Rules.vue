<template>
  <div class="page narrow">
    <div class="panel rules" style="padding:24px">
      <h1 class="hero-title" style="margin-bottom:6px">Règles du jeu</h1>
      <p class="sub">4 à 10 joueurs · un Tueur caché parmi eux · des manches au tour par tour</p>

      <h2>Le principe</h2>
      <p>
        Au début de la partie, l'application désigne secrètement <b>un Tueur</b>. Tous les autres sont des
        <b>Survivants</b>. Chacun commence avec <b>3 points de vie</b>, dans une salle du château tirée au hasard.
      </p>
      <ul>
        <li><b>Les Survivants gagnent</b> si le Tueur tombe à 0 PV.</li>
        <li><b>Le Tueur gagne</b> s'il est le dernier en vie.</li>
      </ul>
      <p>Tout le monde peut frapper : les Survivants doivent démasquer le Tueur… sans s'entretuer.</p>

      <h2>Voir et entendre</h2>
      <ul>
        <li>Tu vois les joueurs <b>visibles</b> présents dans ta salle, et les cadavres.</li>
        <li>Sur la carte, un symbole <v-icon size="16">mdi-account</v-icon> indique combien de joueurs visibles se trouvent dans chaque <b>salle adjacente</b> (sans dire qui).</li>
        <li>Un joueur <b>caché</b> est totalement invisible : une salle où tout le monde se cache paraît vide.</li>
        <li>Tu <b>entends</b> les déplacements et les cris dans les salles voisines (icône <v-icon size="16">mdi-volume-high</v-icon> sur la carte).</li>
        <li>Les coups sont <b>anonymes</b> : si on te frappe, tu sais seulement que tu as été attaqué. À toi de deviner qui, d'après les présents et les bruits.</li>
        <li>Sauf pour qui est <b>caché</b> dans la salle : à l'abri des regards, il voit qui frappe qui (pas dans le noir).</li>
        <li>Ce que tu perçois est consigné dans ton <b>journal</b>, que toi seul peux lire.</li>
        <li>Caché, tu peux <b>écrire sur le mur</b> de ta salle (un message anonyme par manche, à tout moment). Quiconque passe dans la salle peut le lire, sauf dans le noir.</li>
      </ul>

      <h2>Une manche</h2>
      <p><b>1. L'ordre de passage.</b> Le Tueur choisit secrètement sa position (1er, dernier…). Les autres positions
        sont tirées au hasard. Chacun ne connaît que la sienne.</p>
      <p><b>2. Les actions.</b> Chacun à son tour agit directement sur la carte :</p>
      <ul>
        <li><code>Se cacher</code> — rester sur place et devenir invisible. C'est alors la seule action du tour.</li>
        <li><code>Se déplacer</code> — passer dans une salle voisine, puis frapper un joueur visible qui s'y trouve, ou en rester là.</li>
        <li><code>Frapper</code> — infliger 1 PV à un joueur visible de sa salle, puis fuir dans une salle voisine, ou rester sur place.</li>
      </ul>
      <p>
        On ne peut pas se cacher après s'être déplacé ou après avoir frappé. On peut aussi <b>se frapper soi-même</b>
        pour bluffer (« on m'a attaqué ! »), ou <b>retenir son coup</b>. Se déplacer et frapper rendent visible ;
        une personne cachée le reste jusqu'à sa prochaine action. Qui laisse passer son tour reste caché sur place.
      </p>
      <p><b>3. Le bilan.</b> Quand tous ont joué, le bilan tombe (blessures de chacun et cadavres découverts)
        et la manche suivante commence aussitôt. Le débat se tient hors du jeu, sur votre groupe de discussion :
        confrontez vos journaux, accusez, mentez. Les morts, eux, se taisent.</p>

      <h2>Les morts</h2>
      <p>
        Un mort ne parle plus, mais son <b>fantôme</b> erre librement dans le château, invisible, à tout moment :
        il voit ce qu'un vivant verrait dans sa salle. Il peut aussi <b>demander à tout voir</b>, une seule fois.
        Le Tueur reçoit la demande et décide : s'il accepte, le mort voit tout le château en direct — qui est le Tueur,
        où est chacun, même caché, chaque déplacement et chaque coup. S'il refuse, le fantôme ne fait qu'errer.
      </p>

      <h2>Le Blackout</h2>
      <p>
        <b>Une fois par partie</b>, le Tueur peut couper le courant au début d'une manche. Pendant toute la manche,
        personne ne voit plus personne. Les coups se portent à l'aveugle : on frappe un occupant de la salle au hasard.
      </p>

      <router-link to="/" class="btn primary block" style="margin-top:22px">Entrer au château ▸</router-link>
    </div>
  </div>
</template>
