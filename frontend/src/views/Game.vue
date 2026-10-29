<template>
  <div class="page">
    <v-progress-linear v-if="!g" indeterminate color="primary" />

    <!-- ── Partie de l'ancien jeu ─────────────────────────────────── -->
    <div v-else-if="g.legacy" class="narrow" style="max-width:640px;margin:0 auto">
      <div class="panel" style="padding:24px">
        <h1 class="hero-title" style="font-size:24px">{{ g.name }}</h1>
        <p class="sub">Cette partie appartient à l'ancien jeu (Razoonium) et ne peut plus être jouée.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <router-link to="/" class="btn ghost" style="flex:1">Retour</router-link>
          <button v-if="isHost" class="btn danger" style="flex:1" :disabled="busy" @click="removeGame">
            <v-icon size="18">mdi-delete-outline</v-icon> Supprimer
          </button>
        </div>
      </div>
    </div>

    <!-- ── Salle d'attente ─────────────────────────────────────────── -->
    <div v-else-if="g.status === 'lobby'" class="grid2">
      <div class="panel" style="padding:22px">
        <h1 class="hero-title" style="font-size:24px">{{ g.name }}</h1>
        <p class="sub">
          {{ g.minPlayers }} à {{ g.maxPlayers }} joueurs · tour de {{ duration(g.turnSeconds) }}
        </p>
        <div class="ptitle">Code d'accès</div>
        <div class="codebox" title="Copier / partager" @click="share">{{ g.code }}</div>
        <div class="ptitle">Invités au château <span class="tag">{{ g.players.length }}/{{ g.maxPlayers }}</span></div>
        <div class="plist" style="margin-bottom:18px">
          <div v-for="(p, i) in g.players" :key="p.uid" :class="['pcard', { me: i === g.me }]">
            <span class="bar" />
            <span class="nm">{{ p.name }}</span>
            <span v-if="p.uid === g.hostId" class="status lobby">HÔTE</span>
          </div>
        </div>
        <form
          v-if="isHost && g.players.length < g.maxPlayers"
          style="display:flex;gap:10px;margin-bottom:18px" @submit.prevent="addPlayer"
        >
          <select v-model="newPlayer" required @focus="loadCandidates">
            <option value="" disabled>{{ candidates.length ? 'Inviter un joueur…' : 'Aucun joueur à inviter' }}</option>
            <option v-for="c in candidates" :key="c" :value="c">{{ c }}</option>
          </select>
          <button class="btn primary" :disabled="!newPlayer || busy">Inviter</button>
        </form>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn danger" style="flex:1" @click="leave">{{ isHost ? 'Dissoudre' : 'Quitter' }}</button>
          <button
            v-if="isHost" class="btn primary" style="flex:2"
            :disabled="g.players.length < g.minPlayers || busy" @click="start"
          >
            Fermer les portes ▸
          </button>
          <span v-else class="muted" style="flex:2;align-self:center;text-align:center">En attente de l'hôte…</span>
        </div>
        <p v-if="isHost && g.players.length < g.minPlayers" class="muted" style="margin:12px 0 0;text-align:center">
          Encore {{ g.minPlayers - g.players.length }} joueur(s) pour commencer.
        </p>
      </div>
      <div class="panel">
        <div class="ptitle">Salon</div>
        <ChatBox :messages="g.chat" :players="g.players" :me="g.me" can-post :busy="busy" @send="sendChat" />
      </div>
    </div>

    <!-- ── Partie ─────────────────────────────────────────────────── -->
    <template v-else>
      <div class="gamebar">
        <div class="roundbox">
          <div class="num">MANCHE <b>{{ g.round }}</b></div>
          <div class="ph">{{ phaseLabel }}</div>
        </div>
        <span v-if="g.blackout" class="blackout-badge"><v-icon size="16">mdi-lightbulb-off-outline</v-icon> Blackout</span>
        <div v-if="g.status === 'running'" class="infobox">
          <v-icon color="var(--candle)">mdi-timer-sand</v-icon>
          <div>
            <div class="lbl">{{ deadlineLabel }}</div>
            <div :class="['val', 'countdown', { urgent: urgent }]">
              {{ g.deadline > now ? timeLeft(g.deadline, now) : '…' }}
            </div>
          </div>
        </div>
      </div>

      <Teleport to="#subnav">
        <nav class="subnav">
          <button v-for="t in TABS" :key="t.key" :class="{ on: tab === t.key }" @click="setTab(t.key)">
            <v-icon size="16">{{ t.icon }}</v-icon>{{ t.label }}
            <span v-if="t.key === 'journal' && unread" class="count">{{ unread }}</span>
          </button>
        </nav>
      </Teleport>

      <!-- Château : fiche, action, salle, carte -->
      <div v-if="tab === 'chateau'" class="stack">
        <section v-if="g.status === 'over'" :class="['panel', 'winner', g.winner]">
          <h2>{{ g.winner === 'killer' ? 'Le Tueur triomphe' : 'Le Tueur est tombé' }}</h2>
          <p class="muted" style="margin:0 0 14px">
            <b class="pname" :style="{ '--c': g.players[g.reveal.killer].color }">{{ g.players[g.reveal.killer].name }}</b>
            était le Tueur.
            {{ g.winner === 'killer' ? 'Plus personne ne quittera le château.' : 'Les survivants voient enfin l\'aube.' }}
          </p>
          <table class="reveal">
            <tr v-for="(r, i) in g.reveal.players" :key="i">
              <td><b class="pname" :style="{ '--c': g.players[i].color }">{{ g.players[i].name }}</b></td>
              <td><span :class="['role', r.role === 'TUEUR' ? 'killer' : 'survivor']">{{ r.role }}</span></td>
              <td><Hearts :pv="r.pv" :max="g.startPv" /></td>
              <td class="muted">{{ roomOf(r.room).name }}</td>
            </tr>
          </table>
        </section>

        <!-- Phase 1 : le Tueur choisit sa position -->
        <section v-if="g.my.chooseOrder" class="panel">
          <div class="turn-banner killer">
            <b>Choisis ton moment</b>
            <div class="muted">Les autres positions seront tirées au hasard. Personne ne connaîtra la tienne.</div>
          </div>
          <div class="step-title">Position dans la manche</div>
          <div class="positions">
            <button v-for="k in g.turnCount" :key="k" :class="{ sel: orderPos === k }" @click="orderPos = k">{{ k }}</button>
          </div>
          <label v-if="g.my.blackoutAvailable" :class="['toggle', { on: blackout }]" style="margin-top:14px">
            <input v-model="blackout" type="checkbox" />
            <span>
              <b class="cz">Déclencher le Blackout</b><br>
              <span class="muted">Une seule fois par partie : plus personne ne voit rien pendant toute la manche.</span>
            </span>
          </label>
          <button class="btn blood block" style="margin-top:14px" :disabled="!orderPos || busy" @click="sendOrder">
            Que la manche commence ▸
          </button>
        </section>

        <!-- Tueur : des morts demandent à tout voir -->
        <section v-for="i in g.my.sightRequests" :key="`sight${i}`" class="panel">
          <div class="turn-banner killer">
            <b><span class="pname" :style="{ '--c': g.players[i].color }">{{ g.players[i].name }}</span> demande à tout voir</b>
            <div class="muted">Si tu acceptes, son fantôme saura que tu es le Tueur et suivra chaque geste de chacun. Il ne pourra plus parler.</div>
          </div>
          <div class="modal-actions" style="flex-direction:row">
            <button class="btn ghost" style="flex:1" :disabled="busy" @click="answerSight(i, false)">Refuser</button>
            <button class="btn blood" style="flex:1" :disabled="busy" @click="answerSight(i, true)">Accepter</button>
          </div>
        </section>

        <!-- Mort autorisé : tout le château, en direct -->
        <section v-if="g.omni" class="panel">
          <div class="ptitle">
            <v-icon size="18">mdi-eye-outline</v-icon> Tout le château
            <span class="tag">tu vois tout</span>
          </div>
          <OmniMap
            :rooms="g.rooms" :passages="g.passages" :players="g.players" :state="g.omni.players"
            :killer="g.omni.killer" :ghost-room="g.my.room"
          />
          <p class="noise-legend">
            <span><v-icon size="14">mdi-knife</v-icon> le Tueur</span>
            <span><v-icon size="14">mdi-eye-off-outline</v-icon> caché</span>
            <span><v-icon size="14">mdi-skull-outline</v-icon> cadavre</span>
            <span>chiffre = PV</span>
          </p>
        </section>

        <!-- Carte : toucher une salle ouvre ses actions -->
        <section v-else class="panel">
          <div v-if="g.my.myTurn" class="turn-banner">
            <b>C'est ton tour</b>
          </div>
          <!-- Mort : son fantôme erre ; il peut demander au Tueur à tout voir -->
          <div v-if="ghost" class="turn-banner ghost-banner">
            <b><v-icon size="18">mdi-ghost-outline</v-icon> Tu es mort</b>
            <div class="muted">
              Ton fantôme erre librement dans le château, invisible : touche une salle voisine pour t'y rendre.
            </div>
            <button v-if="!g.my.sight" class="btn primary block" style="margin-top:10px" :disabled="busy" @click="requestSight">
              <v-icon size="18">mdi-eye-outline</v-icon> Demander à tout voir
            </button>
            <div v-else-if="g.my.sight === 'pending'" class="muted" style="margin-top:8px">
              <v-icon size="16">mdi-timer-sand</v-icon> Ta demande attend la réponse du Tueur…
            </div>
            <div v-else-if="g.my.sight === 'no'" class="muted" style="margin-top:8px">
              <v-icon size="16">mdi-close-circle-outline</v-icon> Le Tueur a refusé : tu ne peux qu'errer.
            </div>
          </div>
          <!-- Sur mobile, la fiche passe au-dessus de la carte : le coin est trop étroit -->
          <MeCard
            v-if="mobile" row :player="me" :my="g.my" :killer="isKiller" :running="g.status === 'running'"
            :max-pv="g.startPv" :turn-count="g.turnCount" style="margin-bottom:12px"
          />

          <CastleMap
            :rooms="g.rooms" :passages="g.passages" :here="g.my.room" :adjacent="g.my.adjacent"
            :clickable="clickableRooms" :movable="canMove ? g.my.adjacent : []"
            :noise="noise" :people="g.my.nearby" :companions="companions" :dark="g.blackout"
            :self="selfChip"
            :wall-count="g.my.wall.length"
            @pick="openRoom"
          >
            <!-- Fiche du personnage, dans le coin libre en haut à gauche -->
            <MeCard
              v-if="!mobile" :player="me" :my="g.my" :killer="isKiller" :running="g.status === 'running'"
              :max-pv="g.startPv" :turn-count="g.turnCount"
            />
          </CastleMap>

          <p v-if="Object.keys(noise).length" class="noise-legend">
            Entendu cette manche :
            <span><v-icon size="14">mdi-shoe-print</v-icon> des pas</span>
            <span class="cry"><v-icon size="14">mdi-bullhorn-variant-outline</v-icon> un cri</span>
          </p>

          <div v-if="!g.my.myTurn && g.status === 'running' && !ghost" class="sheet">
            <p style="margin:0">{{ waitingText }}</p>
          </div>
        </section>

        <!-- Modale d'une salle : ce qu'on y voit et ce qu'on peut y faire -->
        <v-dialog :model-value="!!modalRoom" max-width="480" @update:model-value="(v) => { if (!v) closeRoom(); }">
          <div v-if="modalRoom" class="panel room-modal">
            <div class="room-head">
              <v-icon color="var(--candle)">{{ roomOf(modalRoom).icon }}</v-icon>
              <h3 style="flex:1">{{ roomOf(modalRoom).name }}</h3>
              <span v-if="modalRoom === g.my.room" class="status lobby">TA SALLE</span>
              <button class="btn ghost icon" title="Fermer" @click="closeRoom"><v-icon size="18">mdi-close</v-icon></button>
            </div>

            <!-- Ma salle -->
            <template v-if="modalRoom === g.my.room">
              <div v-if="g.blackout" class="room-dark">Il fait noir. Tu ne vois personne… ce qui ne veut pas dire que tu es seul.</div>
              <template v-else>
                <div v-if="g.my.visible.length || g.my.corpses.length" class="occupants">
                  <span v-for="i in g.my.visible" :key="i" class="occ" :style="{ '--c': g.players[i].color }">
                    <v-icon size="16">mdi-account</v-icon> {{ g.players[i].name }}
                  </span>
                  <span v-for="i in g.my.corpses" :key="`c${i}`" class="occ corpse">
                    <v-icon size="16">mdi-skull-outline</v-icon> cadavre de {{ g.players[i].name }}
                  </span>
                </div>
                <div v-else class="empty">Personne en vue.</div>
                <template v-if="g.my.wall.length">
                  <div class="step-title" style="margin-top:14px">Sur le mur</div>
                  <p v-for="(w, k) in g.my.wall" :key="k" class="wall-msg">« {{ w.text }} » <span class="muted">— manche {{ w.round }}</span></p>
                </template>
              </template>

              <!-- Choix de la cible -->
              <template v-if="g.my.myTurn && targeting">
                <div class="step-title" style="margin-top:16px">Qui frapper ?</div>
                <div class="modal-actions">
                  <button
                    v-for="t in targetOptions" :key="t.value" :class="['btn', t.cls === 'special' ? 'ghost' : 'blood']"
                    :style="t.color ? { borderColor: t.color } : null" :disabled="busy"
                    @click="step({ step: 'attack', target: t.value })"
                  >{{ t.label }}</button>
                  <button class="btn ghost" @click="targeting = false">Retour</button>
                </div>
              </template>

              <!-- Actions du tour -->
              <div v-else-if="g.my.myTurn" class="modal-actions">
                <button v-if="g.my.steps.includes('hide')" class="btn primary" :disabled="busy" @click="step({ step: 'hide' })">
                  <v-icon size="18">mdi-eye-off-outline</v-icon> Me cacher ici
                </button>
                <button v-if="g.my.steps.includes('attack')" class="btn blood" :disabled="busy" @click="targeting = true">
                  <v-icon size="18">mdi-sword</v-icon> Frapper…
                </button>
                <button v-if="g.my.steps.includes('end')" class="btn primary" :disabled="busy" @click="step({ step: 'end' })">
                  <v-icon size="18">mdi-check</v-icon> Rester ici (fin du tour)
                </button>
              </div>
              <p v-if="g.my.myTurn && g.my.steps.includes('move') && !targeting" class="muted" style="margin:10px 0 0;font-size:15px">
                Pour te déplacer, ferme cette fenêtre et touche une salle voisine.
              </p>

              <!-- Message sur le mur -->
              <form v-if="g.my.canWrite && !targeting" class="write-form" @submit.prevent="sendWall">
                <div class="step-title">Écrire sur le mur <span class="muted" style="text-transform:none;letter-spacing:0">— anonyme, un message par manche</span></div>
                <div class="chat-form">
                  <input v-model="wallText" class="input" maxlength="120" placeholder="Ce que les prochains visiteurs liront…" />
                  <button class="btn ink" :disabled="!wallText.trim() || busy"><v-icon size="18">mdi-draw</v-icon></button>
                </div>
              </form>
            </template>

            <!-- Salle voisine -->
            <template v-else>
              <p style="margin:0 0 6px">{{ roomStatus(modalRoom) }}.</p>
              <p v-if="noise[modalRoom]" class="muted" style="margin:0 0 6px">
                Entendu de ce côté cette manche :
                {{ [noise[modalRoom].steps ? 'des pas' : '', noise[modalRoom].cries ? 'un cri' : ''].filter(Boolean).join(' et ') }}.
              </p>
              <div class="modal-actions">
                <button
                  v-if="g.my.myTurn && g.my.steps.includes('move')" class="btn primary" :disabled="busy"
                  @click="step({ step: 'move', dest: modalRoom })"
                ><v-icon size="18">mdi-shoe-print</v-icon> {{ g.my.pending?.attacked ? 'Fuir' : 'Y aller' }}</button>
                <button v-if="ghost" class="btn primary" :disabled="busy" @click="ghostMove(modalRoom)">
                  <v-icon size="18">mdi-ghost-outline</v-icon> Y errer
                </button>
              </div>
            </template>
          </div>
        </v-dialog>

        <!-- Bilan public : blessures et cadavres annoncés en fin de manche (le débat se fait hors du jeu) -->
        <section class="panel">
          <div class="ptitle">
            Occupants du château
            <span class="tag">{{ lastBilan ? `bilan de la manche ${lastBilan.round}` : 'début de partie' }}</span>
          </div>
          <div v-if="deaths.length" class="deaths">
            <div v-for="d in deaths" :key="d.id" class="death">
              <v-icon color="var(--blood)">mdi-skull-outline</v-icon>
              <span>
                <span class="muted">Manche {{ d.round }} :</span>
                le cadavre de <b class="pname" :style="{ '--c': g.players[d.id].color }">{{ g.players[d.id].name }}</b>
                a été découvert dans {{ roomOf(d.room).the }}.
              </span>
            </div>
          </div>
          <div class="plist">
            <div
              v-for="(p, i) in g.players" :key="p.uid"
              :class="['pcard', { me: i === g.me, dead: !g.public[i].alive }]" :style="{ '--c': p.color }"
            >
              <span class="bar" />
              <span class="nm">{{ p.name }}</span>
              <Hearts v-if="g.public[i].alive" :pv="g.public[i].pv" :max="g.startPv" />
              <span v-else class="status dead">MORT</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Journal privé -->
      <section v-else class="panel narrow" style="margin:0 auto">
        <div class="ptitle">Ce que tu as vu et entendu</div>
        <div class="journal">
          <div v-for="grp in journal" :key="grp.round" class="jround">
            <div class="jh">Manche {{ grp.round }}</div>
            <div
              v-for="e in grp.events" :key="e.id"
              :class="['jline', { noise: e.noise, dark: e.blackout, omni: e.all, new: e.id > seenEvent }]"
            >
              <v-icon size="18" class="mi">{{ lineIcon(e) }}</v-icon>
              <LogLine :text="e.text" :players="g.players" :rooms="g.rooms" />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { auth } from '../stores/auth';
import { toast } from '../stores/toast';
import { PHASES, duration, timeLeft, lineIcon } from '../game';
import CastleMap from '../components/CastleMap.vue';
import LogLine from '../components/LogLine.vue';
import ChatBox from '../components/ChatBox.vue';
import Hearts from '../components/Hearts.vue';
import MeCard from '../components/MeCard.vue';
import OmniMap from '../components/OmniMap.vue';
import { useDisplay } from 'vuetify';

const POLL_MS = 3000;
const TABS = [
  { key: 'chateau', label: 'Château', icon: 'mdi-castle' },
  { key: 'journal', label: 'Journal', icon: 'mdi-script-text-outline' },
];

const props = defineProps({ id: { type: String, required: true } });
const route = useRoute();
const router = useRouter();
const tab = computed(() => (TABS.some((t) => t.key === route.query.tab) ? route.query.tab : 'chateau'));
const setTab = (key) => router.replace({ query: key === 'chateau' ? {} : { tab: key } });

const g = ref(null);
const busy = ref(false);
const now = ref(Date.now());

const { xs: mobile } = useDisplay(); // < 600 px
const isHost = computed(() => g.value?.hostId === auth.user?.id);
const me = computed(() => g.value.players[g.value.me]);
const isKiller = computed(() => g.value.my?.role === 'TUEUR');
const roomOf = (id) => g.value.rooms.find((r) => r.id === id) ?? { name: id, the: id, icon: 'mdi-door' };
const lastBilan = computed(() => g.value.history[g.value.history.length - 1] ?? null);
// Cadavres annoncés aux bilans, du plus récent au plus ancien
const deaths = computed(() => g.value.history.flatMap((b) => b.deaths.map((d) => ({ ...d, round: b.round }))).reverse());

const phaseLabel = computed(() => {
  if (g.value.status === 'over') return 'Partie terminée';
  if (g.value.phase === 'action') return `${PHASES.action} · tour ${g.value.turnNumber} sur ${g.value.turnCount}`;
  return PHASES[g.value.phase];
});
const deadlineLabel = computed(() => {
  if (g.value.my.myTurn || g.value.my.chooseOrder) return 'IL TE RESTE';
  return 'TOUR SUIVANT';
});
const urgent = computed(() => (g.value.my.myTurn || g.value.my.chooseOrder) && g.value.deadline - now.value < 20e3);

const waitingText = computed(() => {
  const { my, phase } = g.value;
  if (!my.alive) return 'Tu es mort. Tu observes la suite, muet.';
  if (phase === 'order') return 'Le Tueur choisit secrètement son moment pour cette manche…';
  if (my.played) return `Tu as joué (position ${my.position}). Attends que les autres aient agi.`;
  return `Tu joues en position ${my.position} sur ${g.value.turnCount}. Reste aux aguets : tu seras prévenu quand ce sera ton tour.`;
});

// Joueurs visibles dans ma salle, affichés sur la carte
const companions = computed(() => g.value.my.visible.map((i) => ({ id: i, ...g.value.players[i] })));

// Bruits entendus cette manche dans les salles voisines : { roomId: { steps, cries } }
const noise = computed(() => {
  const out = {};
  g.value.events.filter((e) => e.round === g.value.round && e.noise).forEach((e) => {
    const kind = /cri/.test(e.text) ? 'cries' : 'steps';
    e.noise.forEach((r) => {
      out[r] = out[r] || { steps: 0, cries: 0 };
      out[r][kind]++;
    });
  });
  return out;
});

// Journal : plus récent d'abord ; « non lus » = arrivés depuis la dernière visite de l'onglet
const journal = computed(() => {
  const groups = new Map();
  g.value.events.slice().reverse().forEach((e) => {
    if (!groups.has(e.round)) groups.set(e.round, []);
    groups.get(e.round).push(e);
  });
  return [...groups].map(([round, events]) => ({ round, events }));
});
const SEEN_KEY = () => `chateau.seen.${props.id}`;
const seenEvent = ref(Number(localStorage.getItem(SEEN_KEY())) || 0);
const lastEvent = computed(() => g.value?.events?.[g.value.events.length - 1]?.id ?? 0);
const unread = computed(() => (tab.value === 'journal' ? 0 : g.value.events.filter((e) => e.id > seenEvent.value).length));
watch([tab, lastEvent], ([t], _old, onCleanup) => {
  if (t !== 'journal') return;
  // on laisse les nouvelles lignes en surbrillance un instant avant de les marquer lues
  const timer = setTimeout(() => {
    seenEvent.value = lastEvent.value;
    localStorage.setItem(SEEN_KEY(), String(seenEvent.value));
  }, 2500);
  onCleanup(() => clearTimeout(timer));
});

// ── Chat ──


function sendChat(text) {
  call(() => api.post(`/games/${props.id}/chat`, { text }));
}

// ── Action : toucher une salle ouvre une modale avec ses actions ──
// Un tour = se cacher (seul) · se déplacer → frapper ou rester · frapper → se déplacer ou rester

const modalRoom = ref(null);
const targeting = ref(false); // « Frapper… » touché : on choisit la cible
const wallText = ref('');

// Mort, partie en cours : son fantôme erre (sauf s'il voit déjà tout)
const ghost = computed(() => !g.value.my.alive && g.value.status === 'running' && !g.value.omni);
const canMove = computed(() => ghost.value || g.value.my.steps.includes('move'));
const selfChip = computed(() => {
  if (g.value.my.alive) return { name: me.value.name, color: me.value.color, hidden: g.value.my.hidden };
  return ghost.value ? { name: me.value.name, color: me.value.color, ghost: true } : null;
});

// Ma salle est toujours consultable (mur, présents) ; les voisines quand on peut s'y rendre
const clickableRooms = computed(() => {
  if (g.value.status !== 'running' || !(g.value.my.alive || ghost.value)) return [];
  return [g.value.my.room, ...(canMove.value ? g.value.my.adjacent : [])];
});

async function ghostMove(dest) {
  if (await call(() => api.post(`/games/${props.id}/ghost`, { dest }))) closeRoom();
}

function requestSight() {
  if (!confirm('Demander au Tueur — sans savoir qui il est — de tout voir ? Une seule demande possible.')) return;
  call(() => api.post(`/games/${props.id}/sight`), 'Demande envoyée au Tueur');
}

function answerSight(i, accept) {
  call(() => api.put(`/games/${props.id}/sight/${i}`, { accept }), accept ? 'Il voit désormais tout' : 'Demande refusée');
}

function openRoom(id) {
  targeting.value = false;
  modalRoom.value = id;
}

function closeRoom() {
  modalRoom.value = null;
  targeting.value = false;
}

async function sendWall() {
  if (await call(() => api.post(`/games/${props.id}/wall`, { text: wallText.value }), 'Message gravé sur le mur')) {
    wallText.value = '';
  }
}

function roomStatus(id) {
  if (g.value.blackout) return 'Impossible de voir qui s\'y trouve, il fait noir';
  const n = g.value.my.nearby[id];
  return n ? `${n} personne${n > 1 ? 's' : ''} en vue` : 'Personne en vue';
}

const targetOptions = computed(() => g.value.my.targets.map((t) => {
  if (t === 'self') return { value: t, label: 'Me blesser (bluff)', cls: 'special' };
  if (t === 'hold') return { value: t, label: 'Retenir mon coup', cls: 'special' };
  if (t === 'blind') return { value: t, label: 'Frapper au hasard dans le noir', cls: 'blind' };
  return { value: t, label: `Frapper ${g.value.players[t].name}`, color: g.value.players[t].color };
}));

/* Après un déplacement, la modale suit dans la nouvelle salle ; fin de tour : elle se ferme */
async function step(body) {
  if (!await call(() => api.post(`/games/${props.id}/action`, body))) return;
  targeting.value = false;
  modalRoom.value = g.value.my.myTurn ? g.value.my.room : null;
}

// ── Ordre (Tueur) ──

const orderPos = ref(null);
const blackout = ref(false);

async function sendOrder() {
  if (blackout.value && !confirm('Couper le courant pour toute la manche ? Tu ne pourras plus le refaire.')) return;
  if (await call(() => api.put(`/games/${props.id}/order`, { position: orderPos.value, blackout: blackout.value }))) {
    orderPos.value = null;
    blackout.value = false;
  }
}

// ── Chargement ──

function apply(data) {
  const prev = g.value;
  g.value = data;
  if (!prev || data.status === 'lobby' || data.legacy) return;
  const wasTurn = prev.my?.myTurn || prev.my?.chooseOrder;
  const isTurn = data.my.myTurn || data.my.chooseOrder;
  if (isTurn && !wasTurn) {
    toast(data.my.chooseOrder ? 'Choisis ta position, Tueur…' : 'C\'est ton tour !');
    navigator.vibrate?.(200);
  }
  if ((data.my.sightRequests?.length ?? 0) > (prev.my?.sightRequests?.length ?? 0)) {
    toast('Un mort demande à tout voir');
    navigator.vibrate?.(200);
  }
  if (prev.my?.sight === 'pending' && data.my.sight && data.my.sight !== 'pending') {
    toast(data.my.sight === 'yes' ? 'Le Tueur accepte : tu vois tout' : 'Le Tueur refuse ta demande');
  }
  if (!data.my.myTurn) targeting.value = false;
  // salle voisine ouverte alors qu'on ne peut plus s'y rendre : on ferme
  const wandering = !data.my.alive && data.status === 'running' && !data.omni;
  if (modalRoom.value && modalRoom.value !== data.my.room && !data.my.steps.includes('move') && !wandering) closeRoom();
  if (data.omni) closeRoom();
  if (prev.status === 'running' && data.status === 'over') toast('Partie terminée');
  else if (data.status === 'running' && data.round > prev.round) toast(`Fin de la manche ${prev.round}`);
}

async function load() {
  try {
    apply((await api.get(`/games/${props.id}`)).data);
  } catch (e) {
    // partie supprimée par l'hôte pendant qu'on la consultait
    if (e.status === 404 && g.value) {
      toast('Cette partie a été supprimée par l\'hôte.');
      return router.replace('/');
    }
    toast(e.message);
    if (!g.value) router.replace('/');
  }
}

async function call(request, success) {
  busy.value = true;
  try {
    const { data } = await request();
    if (data) apply(data);
    if (success) toast(success);
    return true;
  } catch (e) {
    toast(e.message);
    load();
    return false;
  } finally {
    busy.value = false;
  }
}

// ── Lobby ──

const newPlayer = ref('');
const candidates = ref([]);
async function loadCandidates() {
  try {
    candidates.value = (await api.get(`/games/${props.id}/candidates`)).data;
  } catch { /* liste indisponible : on garde la précédente */ }
}
async function addPlayer() {
  const name = newPlayer.value;
  const before = g.value.players.length;
  await call(() => api.post(`/games/${props.id}/players`, { username: name }));
  if (g.value.players.length > before) {
    toast(`${name} a été invité`);
    newPlayer.value = '';
    candidates.value = candidates.value.filter((c) => c !== name);
  }
}

function start() {
  call(() => api.post(`/games/${props.id}/start`), 'Les portes se referment…');
}

async function leave() {
  if (!confirm(isHost.value ? 'Dissoudre cette partie ?' : 'Quitter cette partie ?')) return;
  if (await call(() => api.delete(`/games/${props.id}/membership`))) router.replace('/');
}

async function removeGame() {
  if (!confirm(`Supprimer définitivement « ${g.value.name} » ?`)) return;
  busy.value = true;
  try {
    await api.delete(`/games/${props.id}`);
    toast('Partie supprimée');
    router.replace('/');
  } catch (e) {
    toast(e.message);
  } finally {
    busy.value = false;
  }
}

async function share() {
  const text = `Rejoins-moi au Château des Ténèbres « ${g.value.name} » avec le code ${g.value.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Le Château des Ténèbres', text, url: location.origin });
    else {
      await navigator.clipboard.writeText(g.value.code);
      toast('Code copié');
    }
  } catch { /* partage annulé */ }
}

let poll;
let clock;
let lastDeadlineReload = 0;
function onVisible() {
  if (document.visibilityState === 'visible') load();
}

onMounted(() => {
  load().then(() => { if (isHost.value && g.value?.status === 'lobby') loadCandidates(); });
  poll = setInterval(() => {
    if (document.visibilityState === 'visible' && !busy.value && !g.value?.legacy) load();
  }, POLL_MS);
  clock = setInterval(() => {
    now.value = Date.now();
    // échéance atteinte : on recharge pour faire avancer la partie côté serveur
    const d = g.value?.deadline;
    if (d && now.value >= d && now.value - lastDeadlineReload > 3000) {
      lastDeadlineReload = now.value;
      load();
    }
  }, 1000);
  document.addEventListener('visibilitychange', onVisible);
});

onBeforeUnmount(() => {
  clearInterval(poll);
  clearInterval(clock);
  document.removeEventListener('visibilitychange', onVisible);
});
</script>
