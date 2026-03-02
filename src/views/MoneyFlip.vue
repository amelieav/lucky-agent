<template>
  <section class="card p-5 space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Money Flip</h1>
        <p class="text-sm text-muted">Flop 3, pick your second card, then beat the duck's hand.</p>
        <details class="moneyflip-howto mt-2">
          <summary>How To Play</summary>
          <div class="moneyflip-howto__body">
            <p>
              You and the duck each build a best 5-card poker hand from 7 total cards:
              your 2 hole cards + 5 board cards.
            </p>
            <p>
              Modified flow in Money Flip:
              the flop (3 cards) and your first hole card are revealed first, then you pick 1 of 3 cards as your second hole card.
              The turn and river are dealt after your pick.
            </p>
            <p class="moneyflip-howto__label">Hand strength (highest to lowest):</p>
            <ol class="moneyflip-howto__list">
              <li>Straight Flush</li>
              <li>Four of a Kind</li>
              <li>Full House</li>
              <li>Flush</li>
              <li>Straight</li>
              <li>Three of a Kind</li>
              <li>Two Pair</li>
              <li>One Pair</li>
              <li>High Card</li>
            </ol>
            <p>
              Winnings:
              win = +wager (your return shown as double payout),
              loss = -wager,
              tie = push (0 net change).
            </p>
          </div>
        </details>
      </div>
      <div class="text-right text-sm space-y-1">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted">Coins</p>
          <p class="text-xl font-semibold">{{ formatNumber(playerCoins) }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-muted">Season Gambled</p>
          <p class="text-base font-semibold">{{ formatNumber(seasonGambledCoins) }}</p>
        </div>
      </div>
    </div>

    <section class="rounded-xl border border-soft bg-panel-soft p-4 space-y-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in wagerPresets"
          :key="`wager-${preset.value}`"
          class="wager-chip"
          :class="{ 'wager-chip--active': normalizedWager() === preset.value }"
          type="button"
          :disabled="actionLoading || !canEditWager"
          @click="setWager(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto] sm:items-end">
        <label class="block text-sm font-semibold text-main">
          Custom Wager
          <input
            v-model.number="wagerInput"
            class="money-flip-input mt-2"
            type="number"
            min="1"
            step="1"
            :max="Math.max(1, playerCoins)"
            :disabled="actionLoading || !canEditWager"
          />
        </label>
        <button class="btn-primary w-full sm:w-auto" type="button" :disabled="!canStartRound" @click="startRound">
          Start Hand
        </button>
      </div>
      <p class="text-xs text-muted">Default wager is 10% of your current coins.</p>
    </section>

    <p v-if="roundMessage" class="rounded-xl border border-soft bg-panel-soft p-3 text-sm text-main">{{ roundMessage }}</p>
    <p v-if="localError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ localError }}</p>
    <p v-else-if="gameError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ gameError }}</p>

    <section class="rounded-xl border border-soft bg-panel-soft p-4 space-y-4">
      <div class="moneyflip-row">
        <div class="moneyflip-row__head">
          <p class="text-xs uppercase tracking-wide text-muted">Villain (Duck)</p>
          <img :src="duckFaceSrc" alt="Duck villain" class="duck-face" :class="duckFaceClass" />
          <p class="text-sm font-semibold">{{ result?.villain_hand_label || 'Waiting...' }}</p>
        </div>
        <div class="moneyflip-cards">
          <div v-for="(card, index) in villainDisplayCards" :key="`villain-${index}`" class="play-card-wrap">
            <template v-if="card">
              <div class="play-card" :class="[cardColorClass(card), { 'play-card--drop': shouldDropVillainCard(index) }]">
                <span class="play-card__rank-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__rank-svg">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4" class="play-card__rank-bg" />
                    <text x="12" y="16" text-anchor="middle" class="play-card__rank-text">{{ cardRank(card) }}</text>
                  </svg>
                </span>
                <span class="play-card__suit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__suit-svg">
                    <path :d="cardSuitPath(card)" />
                  </svg>
                </span>
              </div>
            </template>
            <div v-else class="play-card-back">?</div>
          </div>
        </div>
      </div>

      <div class="moneyflip-row">
        <div class="moneyflip-row__head">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">Board</p>
            <p class="text-sm font-semibold">Flop / Turn / River</p>
          </div>
        </div>
        <div class="moneyflip-cards">
          <div v-for="(card, index) in boardCards" :key="`board-${index}`" class="play-card-wrap">
            <template v-if="card">
              <div class="play-card" :class="[cardColorClass(card), { 'play-card--drop': shouldDropBoardCard(index) }]">
                <span class="play-card__rank-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__rank-svg">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4" class="play-card__rank-bg" />
                    <text x="12" y="16" text-anchor="middle" class="play-card__rank-text">{{ cardRank(card) }}</text>
                  </svg>
                </span>
                <span class="play-card__suit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__suit-svg">
                    <path :d="cardSuitPath(card)" />
                  </svg>
                </span>
              </div>
            </template>
            <div v-else class="play-card-back">?</div>
          </div>
        </div>
      </div>

      <div class="moneyflip-row">
        <div class="moneyflip-row__head">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">You</p>
            <p class="text-sm font-semibold">{{ result?.player_hand_label || 'Choose your second card' }}</p>
          </div>
        </div>

        <div class="moneyflip-subrow">
          <p class="moneyflip-subrow__label">Your Hole Cards</p>
          <div class="moneyflip-cards moneyflip-cards--compact">
            <div class="play-card-wrap">
              <template v-if="playerFirstCard">
                <div class="play-card" :class="cardColorClass(playerFirstCard)">
                  <span class="play-card__rank-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="play-card__rank-svg">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4" class="play-card__rank-bg" />
                      <text x="12" y="16" text-anchor="middle" class="play-card__rank-text">{{ cardRank(playerFirstCard) }}</text>
                    </svg>
                  </span>
                  <span class="play-card__suit-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="play-card__suit-svg">
                      <path :d="cardSuitPath(playerFirstCard)" />
                    </svg>
                  </span>
                </div>
              </template>
              <div v-else class="play-card-back">?</div>
            </div>
            <div class="play-card-wrap">
              <template v-if="selectedPlayerCard">
                <div class="play-card" :class="cardColorClass(selectedPlayerCard)">
                  <span class="play-card__rank-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="play-card__rank-svg">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4" class="play-card__rank-bg" />
                      <text x="12" y="16" text-anchor="middle" class="play-card__rank-text">{{ cardRank(selectedPlayerCard) }}</text>
                    </svg>
                  </span>
                  <span class="play-card__suit-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="play-card__suit-svg">
                      <path :d="cardSuitPath(selectedPlayerCard)" />
                    </svg>
                  </span>
                </div>
              </template>
              <div v-else class="play-card-back">?</div>
            </div>
          </div>
        </div>

        <div class="moneyflip-subrow">
          <p class="moneyflip-subrow__label">Choose One</p>
          <div class="moneyflip-cards moneyflip-cards--compact">
            <button
              v-for="(card, index) in choiceCards"
              :key="`choice-${index}`"
              class="play-card-wrap play-card-pick"
              type="button"
              :disabled="!canPick(index)"
              @click="pickChoice(index)"
            >
              <div class="play-card play-card--choice" :class="[cardColorClass(card), { 'play-card--selected': selectedPickIndex === index }]">
                <span class="play-card__rank-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__rank-svg">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4" class="play-card__rank-bg" />
                    <text x="12" y="16" text-anchor="middle" class="play-card__rank-text">{{ cardRank(card) }}</text>
                  </svg>
                </span>
                <span class="play-card__suit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="play-card__suit-svg">
                    <path :d="cardSuitPath(card)" />
                  </svg>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="phase === 'resolved' && result" class="rounded-xl border border-soft bg-panel-soft p-4">
      <p class="text-base font-semibold" :class="result.won ? 'text-green-700' : (result.is_tie ? 'text-main' : 'text-red-700')">
        {{ result.won ? 'You beat the duck. Double payout.' : (result.is_tie ? 'Split pot. Tie hand (push).' : 'Duck wins this hand.') }}
      </p>
      <p class="mt-1 text-sm text-muted">
        Wager: {{ formatNumber(result.wager) }} · Net:
        <span :class="result.won ? 'text-green-700 font-semibold' : (result.is_tie ? 'text-main font-semibold' : 'text-red-700 font-semibold')">
          {{ Number(result.net_change || 0) > 0 ? `+${formatNumber(result.net_change)}` : formatNumber(result.net_change) }}
        </span>
      </p>
      <button class="btn-secondary mt-3" type="button" @click="resetBoard">Play Again</button>
    </section>

    <section class="rounded-xl border border-soft bg-panel-soft p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold">Money Flip Leaderboard</h2>
        <button class="btn-secondary" type="button" :disabled="leaderboardLoading" @click="refreshMoneyFlipLeaderboard">
          {{ leaderboardLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div class="grid gap-2 sm:grid-cols-4">
        <article class="rounded-lg border border-soft bg-white/70 p-3 text-sm">
          <p class="text-xs uppercase tracking-wide text-muted">Most Gambled</p>
          <p class="mt-1 font-semibold">{{ mostGambledRow?.display_name || 'None' }}</p>
          <p class="text-xs text-muted">{{ formatNumber(mostGambledRow?.season_gambled_coins || 0) }} coins</p>
        </article>
        <article class="rounded-lg border border-soft bg-white/70 p-3 text-sm">
          <p class="text-xs uppercase tracking-wide text-muted">Most Won</p>
          <p class="mt-1 font-semibold">{{ mostWonRow?.display_name || 'None' }}</p>
          <p class="text-xs text-green-700" v-if="mostWonRow">
            {{ formatNumber(mostWonRow.season_gamble_won_coins || 0) }} coins
          </p>
          <p class="text-xs text-muted" v-else>--</p>
        </article>
        <article class="rounded-lg border border-soft bg-white/70 p-3 text-sm">
          <p class="text-xs uppercase tracking-wide text-muted">Most Lost</p>
          <p class="mt-1 font-semibold">{{ mostLostRow?.display_name || 'None' }}</p>
          <p class="text-xs text-red-700" v-if="mostLostRow">{{ formatNumber(mostLostRow.season_gamble_lost_coins || 0) }} coins</p>
          <p class="text-xs text-muted" v-else>--</p>
        </article>
        <article class="rounded-lg border border-soft bg-white/70 p-3 text-sm">
          <p class="text-xs uppercase tracking-wide text-muted">Top Net</p>
          <p class="mt-1 font-semibold">{{ topNetRow?.display_name || 'None' }}</p>
          <p class="text-xs" :class="Number(topNetRow?.season_gamble_net_coins || 0) >= 0 ? 'text-green-700' : 'text-red-700'" v-if="topNetRow">
            {{ Number(topNetRow?.season_gamble_net_coins || 0) >= 0 ? '+' : '' }}{{ formatNumber(topNetRow?.season_gamble_net_coins || 0) }} coins
          </p>
          <p class="text-xs text-muted" v-else>--</p>
        </article>
      </div>

      <p v-if="leaderboardError" class="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{{ leaderboardError }}</p>

      <div class="overflow-x-auto">
        <table class="moneyflip-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Gambled</th>
              <th>Won</th>
              <th>Lost</th>
              <th>Net</th>
              <th>Rounds</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in moneyFlipLeaderboardRows" :key="`moneyflip-row-${row.user_id}-${index}`">
              <td>{{ index + 1 }}</td>
              <td>{{ row.display_name }}</td>
              <td>{{ formatNumber(row.season_gambled_coins) }}</td>
              <td class="text-green-700">{{ formatNumber(row.season_gamble_won_coins) }}</td>
              <td class="text-red-700">{{ formatNumber(row.season_gamble_lost_coins) }}</td>
              <td :class="Number(row.season_gamble_net_coins || 0) >= 0 ? 'text-green-700' : 'text-red-700'">
                {{ Number(row.season_gamble_net_coins || 0) >= 0 ? '+' : '' }}{{ formatNumber(row.season_gamble_net_coins) }}
              </td>
              <td>{{ formatNumber(row.season_gamble_rounds) }}</td>
            </tr>
            <tr v-if="!moneyFlipLeaderboardRows.length">
              <td colspan="7" class="text-center text-muted">No gambling results yet this season.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const phase = ref('idle')
const wagerInput = ref(1)
const round = ref(null)
const result = ref(null)
const resolvedPreview = ref(null)
const localError = ref(null)
const selectedPickIndex = ref(null)
const moneyFlipLeaderboardRows = ref([])
const leaderboardLoading = ref(false)
const leaderboardError = ref(null)
const revealedBoard = ref([null, null, null, null, null])
const revealedVillainCount = ref(0)
let phaseTimer = null
let duckAnimTimer = null
const duckAnimTick = ref(0)

const snapshot = computed(() => store.state.game.snapshot || null)
const gameError = computed(() => store.state.game.error)
const actionLoading = computed(() => Boolean(store.state.game.actionLoading))
const playerCoins = computed(() => Math.max(0, Number(snapshot.value?.state?.coins || 0)))
const seasonGambledCoins = computed(() => Math.max(0, Number(snapshot.value?.state?.season_gambled_coins || 0)))
const mostGambledRow = computed(() => {
  const rows = moneyFlipLeaderboardRows.value.slice()
  rows.sort((a, b) => Number(b.season_gambled_coins || 0) - Number(a.season_gambled_coins || 0))
  return rows[0] || null
})
const mostWonRow = computed(() => {
  const rows = moneyFlipLeaderboardRows.value
    .filter((row) => Number(row.season_gamble_won_coins || 0) > 0)
    .slice()
  rows.sort((a, b) => Number(b.season_gamble_won_coins || 0) - Number(a.season_gamble_won_coins || 0))
  return rows[0] || null
})
const mostLostRow = computed(() => {
  const rows = moneyFlipLeaderboardRows.value
    .filter((row) => Number(row.season_gamble_lost_coins || 0) > 0)
    .slice()
  rows.sort((a, b) => Number(b.season_gamble_lost_coins || 0) - Number(a.season_gamble_lost_coins || 0))
  return rows[0] || null
})
const topNetRow = computed(() => {
  const rows = moneyFlipLeaderboardRows.value.slice()
  rows.sort((a, b) => Number(b.season_gamble_net_coins || 0) - Number(a.season_gamble_net_coins || 0))
  return rows[0] || null
})
const duckFaceSrc = computed(() => {
  if (phase.value === 'resolved' && result.value) {
    if (result.value.won) {
      return (duckAnimTick.value % 2 === 0) ? duckAsset('cry1.png') : duckAsset('cry2.png')
    }
    if (!result.value.is_tie) {
      return duckAsset('drag1.png')
    }
  }
  return (duckAnimTick.value % 2 === 0) ? duckAsset('drag1.png') : duckAsset('drag2.png')
})
const duckFaceClass = computed(() => {
  if (phase.value === 'resolved' && result.value?.won) return 'duck-face--crying'
  if (phase.value === 'resolved' && result.value && !result.value.won && !result.value.is_tie) return 'duck-face--joy'
  return ''
})

const canEditWager = computed(() => !actionLoading.value)
const canStartRound = computed(() => {
  const wager = normalizedWager()
  return !actionLoading.value && wager > 0 && wager <= playerCoins.value
})

const wagerPresets = computed(() => {
  const coins = Math.max(1, playerCoins.value)
  const values = [
    Math.max(1, Math.floor(coins / 20)),
    Math.max(1, Math.floor(coins / 10)),
    Math.max(1, Math.floor(coins / 5)),
    Math.max(1, Math.floor(coins / 2)),
    coins,
  ]
  const unique = [...new Set(values)]
  return unique.map((value) => ({
    value,
    label: `${formatNumber(value)} coins`,
  }))
})

const playerFirstCard = computed(() => round.value?.player_hole?.[0] || null)
const choiceCards = computed(() => round.value?.choice_options || [])
const selectedPlayerCard = computed(() => {
  if (result.value?.selected_option) return result.value.selected_option
  if (selectedPickIndex.value == null) return null
  return choiceCards.value[selectedPickIndex.value] || null
})
const villainCards = computed(() => (
  resolvedPreview.value?.villain_cards
  || result.value?.villain_cards
  || []
))
const villainDisplayCards = computed(() => {
  const all = villainCards.value
  if (!all.length) return [null, null]
  const shown = Math.max(0, Math.min(2, Number(revealedVillainCount.value || 0)))
  return [
    shown >= 1 ? (all[0] || null) : null,
    shown >= 2 ? (all[1] || null) : null,
  ]
})
const boardCards = computed(() => {
  return revealedBoard.value
})

const roundMessage = computed(() => {
  if (phase.value === 'idle') return 'Start a hand to play against the duck.'
  if (phase.value === 'pick') return 'Choose 1 of 3 cards for your second hole card.'
  if (phase.value === 'dealingTurn') return 'Turn card dealt...'
  if (phase.value === 'dealingRiver') return 'River card dealt...'
  if (phase.value === 'revealVillainOne') return 'Duck reveals first card...'
  if (phase.value === 'revealVillainTwo') return 'Duck reveals second card...'
  if (phase.value === 'resolving') return 'Comparing hands...'
  if (phase.value === 'resolved') {
    if (result.value?.is_tie) return 'Tie hand.'
    return result.value?.won ? 'Winning hand.' : 'Losing hand.'
  }
  return null
})

function normalizedWager() {
  const value = Math.floor(Number(wagerInput.value || 0))
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function setWager(value) {
  wagerInput.value = Math.max(1, Math.min(Math.max(1, playerCoins.value), Math.floor(Number(value || 1))))
}

function defaultWagerFromCoins(coins) {
  const safeCoins = Math.max(1, Math.floor(Number(coins || 0)))
  return Math.max(1, Math.floor(safeCoins / 10))
}

function cardRank(card) {
  const value = String(card || '').trim().toUpperCase()
  const objectRank = value.match(/"RANK"\s*:\s*"([2-9TJQKA])"/)
  if (objectRank?.[1]) return objectRank[1]

  const compact = value.match(/\b([2-9TJQKA])[SHDC]\b/)
  if (compact?.[1]) return compact[1]

  const match = value.match(/([2-9TJQKA])/)
  return match?.[1] || '?'
}

function duckAsset(fileName) {
  return `${import.meta.env.BASE_URL || '/'}ducks/${fileName}`
}

function cardSuit(card) {
  const value = String(card || '').trim().toUpperCase()
  const objectSuit = value.match(/"SUIT"\s*:\s*"([SHDC])"/)
  if (objectSuit?.[1]) return objectSuit[1]

  const compact = value.match(/\b[2-9TJQKA]([SHDC])\b/)
  if (compact?.[1]) return compact[1]

  const trailing = value.match(/([SHDC])\s*$/)
  if (trailing?.[1]) return trailing[1]

  const all = value.match(/[SHDC]/g)
  return all?.length ? all[all.length - 1] : ''
}

function cardSuitPath(card) {
  const suit = cardSuit(card)
  if (suit === 'H') return 'M12 21S4 15.5 4 10a4 4 0 0 1 7-2.5A4 4 0 0 1 18 10c0 5.5-8 11-8 11z'
  if (suit === 'D') return 'M12 2l7 10-7 10-7-10z'
  if (suit === 'C') return 'M8.2 14.6a3.6 3.6 0 1 1 2.8-5.9a3.6 3.6 0 1 1 2 0a3.6 3.6 0 1 1 2.8 5.9A3.6 3.6 0 0 1 12 13.5a3.6 3.6 0 0 1-3.8 1.1zM11 14h2v5h-2z'
  if (suit === 'S') return 'M12 2C9 6 5 8.6 5 12a4 4 0 0 0 7 2.7V18H9.6a2.4 2.4 0 0 0 4.8 0H12v-3.3A4 4 0 0 0 19 12c0-3.4-4-6-7-10z'
  return 'M12 4l8 8-8 8-8-8z'
}

function cardColorClass(card) {
  const suit = cardSuit(card)
  return (suit === 'H' || suit === 'D') ? 'play-card--red' : 'play-card--black'
}

function clearPhaseTimer() {
  if (!phaseTimer) return
  window.clearTimeout(phaseTimer)
  phaseTimer = null
}

function wait(ms) {
  return new Promise((resolve) => {
    phaseTimer = window.setTimeout(resolve, ms)
  })
}

async function startRound() {
  if (!canStartRound.value) return
  clearPhaseTimer()
  localError.value = null
  phase.value = 'idle'
  round.value = null
  result.value = null
  resolvedPreview.value = null
  revealedBoard.value = [null, null, null, null, null]
  revealedVillainCount.value = 0
  selectedPickIndex.value = null

  try {
    const nextRound = await store.dispatch('game/startMoneyFlip', { wager: normalizedWager() })
    if (!nextRound) throw new Error('Unable to start hand')
    round.value = nextRound
    const flop = Array.isArray(nextRound.flop) ? nextRound.flop : []
    revealedBoard.value = [flop[0] || null, flop[1] || null, flop[2] || null, null, null]
    revealedVillainCount.value = 0
    phase.value = 'pick'
    void refreshMoneyFlipLeaderboard()
  } catch (error) {
    round.value = null
    phase.value = 'idle'
    localError.value = error?.message || 'Unable to start money flip.'
  }
}

function canPick(index) {
  return phase.value === 'pick' && !actionLoading.value && index >= 0 && index < (round.value?.choice_options?.length || 0)
}

function shouldDropBoardCard(index) {
  if (index === 3) return !!boardCards.value[3]
  if (index === 4) return !!boardCards.value[4]
  return false
}

function shouldDropVillainCard(index) {
  return index < Number(revealedVillainCount.value || 0)
}

async function pickChoice(index) {
  if (!canPick(index) || !round.value) return
  localError.value = null
  selectedPickIndex.value = index

  try {
    const resolved = await store.dispatch('game/resolveMoneyFlip', {
      roundId: round.value.round_id,
      pickIndex: index,
    })
    if (!resolved) throw new Error('Unable to resolve money flip.')
    resolvedPreview.value = resolved

    const finalBoard = Array.isArray(resolved.board) ? resolved.board : []

    phase.value = 'dealingTurn'
    revealedBoard.value = [
      boardCards.value[0] || null,
      boardCards.value[1] || null,
      boardCards.value[2] || null,
      finalBoard[3] || null,
      null,
    ]
    await wait(1800)

    phase.value = 'dealingRiver'
    revealedBoard.value = [
      boardCards.value[0] || null,
      boardCards.value[1] || null,
      boardCards.value[2] || null,
      finalBoard[3] || null,
      finalBoard[4] || null,
    ]
    await wait(1800)

    phase.value = 'revealVillainOne'
    revealedVillainCount.value = 1
    await wait(1400)

    phase.value = 'revealVillainTwo'
    revealedVillainCount.value = 2
    await wait(1400)

    phase.value = 'resolving'
    await wait(700)
    result.value = resolved
    phase.value = 'resolved'
    void refreshMoneyFlipLeaderboard()
  } catch (error) {
    phase.value = 'pick'
    resolvedPreview.value = null
    localError.value = error?.message || 'Unable to resolve money flip.'
  }
}

async function refreshMoneyFlipLeaderboard() {
  leaderboardLoading.value = true
  leaderboardError.value = null
  try {
    const rows = await store.dispatch('game/fetchMoneyFlipLeaderboard', { limit: 50 })
    moneyFlipLeaderboardRows.value = Array.isArray(rows) ? rows : []
  } catch (error) {
    leaderboardError.value = error?.message || 'Unable to load money flip leaderboard.'
  } finally {
    leaderboardLoading.value = false
  }
}

function resetBoard() {
  clearPhaseTimer()
  round.value = null
  result.value = null
  resolvedPreview.value = null
  revealedBoard.value = [null, null, null, null, null]
  revealedVillainCount.value = 0
  selectedPickIndex.value = null
  localError.value = null
  phase.value = 'idle'
  setWager(defaultWagerFromCoins(playerCoins.value))
}

onMounted(async () => {
  duckAnimTimer = window.setInterval(() => {
    duckAnimTick.value += 1
  }, 420)
  await store.dispatch('auth/initAuth')
  if (!store.state.game.snapshot) {
    await store.dispatch('game/bootstrapPlayer')
  }
  setWager(defaultWagerFromCoins(playerCoins.value))
  await refreshMoneyFlipLeaderboard()
})

watch(playerCoins, (coins) => {
  if (phase.value !== 'idle') return
  const current = normalizedWager()
  if (current <= 0 || current > coins) {
    setWager(defaultWagerFromCoins(coins))
  }
})

onUnmounted(() => {
  clearPhaseTimer()
  if (duckAnimTimer) {
    window.clearInterval(duckAnimTimer)
    duckAnimTimer = null
  }
})
</script>

<style scoped>
.money-flip-input {
  width: 100%;
  border: 1px solid rgba(120, 143, 194, 0.42);
  border-radius: 0.72rem;
  padding: 0.54rem 0.66rem;
  background: rgba(255, 255, 255, 0.9);
  color: #173059;
  font-weight: 600;
}

.moneyflip-howto {
  width: min(42rem, 100%);
  border: 1px solid rgba(120, 143, 194, 0.28);
  border-radius: 0.72rem;
  background: rgba(245, 249, 255, 0.78);
  padding: 0.45rem 0.65rem;
}

.moneyflip-howto > summary {
  cursor: pointer;
  user-select: none;
  font-size: 0.78rem;
  font-weight: 700;
  color: #29497c;
}

.moneyflip-howto__body {
  margin-top: 0.45rem;
  border-top: 1px solid rgba(120, 143, 194, 0.24);
  padding-top: 0.45rem;
  display: grid;
  gap: 0.4rem;
  font-size: 0.73rem;
  color: #2a426e;
}

.moneyflip-howto__label {
  font-weight: 700;
  color: #1f3c6a;
}

.moneyflip-howto__list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.14rem;
}

.wager-chip {
  border: 1px solid rgba(120, 143, 194, 0.34);
  border-radius: 999px;
  padding: 0.28rem 0.58rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: #2d4878;
  background: rgba(236, 244, 255, 0.88);
}

.wager-chip--active {
  color: #173160;
  border-color: rgba(63, 101, 180, 0.56);
  background: rgba(215, 230, 255, 0.95);
}

.moneyflip-row {
  display: grid;
  gap: 0.55rem;
}

.moneyflip-row__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  text-align: center;
}

.duck-face {
  width: 10.4rem;
  height: 10.4rem;
  margin: -1.9rem 0 -4.6rem;
  object-fit: contain;
}

.duck-face--crying {
  animation: duck-cry-bob 0.1s ease-in-out infinite;
  margin: -2.4rem 0 -3.2rem;
}

.duck-face--joy {
  animation: duck-joy-spin 0.55s linear infinite;
}

.moneyflip-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
}

.moneyflip-cards--compact {
  gap: 0.35rem;
}

.moneyflip-subrow {
  width: 100%;
  border: 1px solid rgba(130, 151, 193, 0.28);
  border-radius: 0.62rem;
  padding: 0.4rem;
  background: rgba(255, 255, 255, 0.5);
}

.moneyflip-subrow__label {
  margin: 0 0 0.32rem;
  text-align: center;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  font-weight: 700;
  text-transform: uppercase;
  color: #49648f;
}

.play-card-wrap {
  border: 0;
  background: transparent;
  padding: 0;
}

.play-card {
  width: 3.8rem;
  height: 5.2rem;
  border-radius: 0.68rem;
  border: 1px solid rgba(69, 91, 136, 0.38);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 5px 10px rgba(38, 58, 95, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.play-card--selected {
  outline: 2px solid rgba(45, 89, 175, 0.62);
}

.play-card--choice {
  border-style: dashed;
}

.play-card--drop {
  animation: card-drop-in 0.8s cubic-bezier(0.18, 0.84, 0.22, 1);
}

.play-card--red {
  color: #b03f4a;
}

.play-card--black {
  color: #1f3558;
}

.play-card__rank-icon {
  line-height: 0;
}

.play-card__rank-svg {
  width: 1.74rem;
  height: 1.74rem;
  display: block;
}

.play-card__rank-bg {
  fill: transparent;
  stroke: none;
}

.play-card__rank-text {
  fill: currentColor;
  font-size: 18px;
  font-weight: 800;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}

.play-card__suit-icon {
  margin-top: 0.28rem;
  line-height: 0;
}

.play-card__suit-svg {
  width: 1.58rem;
  height: 1.58rem;
  display: block;
  fill: currentColor;
}

.play-card-back {
  width: 3.8rem;
  height: 5.2rem;
  border-radius: 0.68rem;
  border: 1px solid rgba(77, 104, 156, 0.36);
  display: grid;
  place-items: center;
  color: #f7f8ff;
  font-size: 0.95rem;
  font-weight: 700;
  background: linear-gradient(155deg, rgba(96, 124, 186, 0.98), rgba(58, 85, 147, 0.95));
}

.play-card-pick {
  cursor: pointer;
}

.play-card-pick:disabled {
  cursor: not-allowed;
}

.moneyflip-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.moneyflip-table th,
.moneyflip-table td {
  padding: 0.44rem 0.52rem;
  border-bottom: 1px solid rgba(131, 152, 192, 0.24);
  text-align: left;
  white-space: nowrap;
}

.moneyflip-table thead th {
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4e6994;
}

@keyframes duck-joy-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes duck-cry-bob {
  0% { transform: translateY(0px); }
  50% { transform: translateY(3px); }
  100% { transform: translateY(0px); }
}

@keyframes card-drop-in {
  0% {
    transform: translateY(-34px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
