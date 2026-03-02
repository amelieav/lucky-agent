<template>
  <section class="card p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Global Leaderboard</h1>
        <p class="text-sm text-muted">Ranks by highest card, then number of copies of that card.</p>
      </div>
      <div class="text-right">
        <p class="text-[11px] uppercase tracking-wide text-muted">Auto Refresh</p>
        <p class="text-sm font-semibold text-main">in {{ refreshCountdown }}s</p>
      </div>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2">
      <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm">
        <p class="text-xs text-muted">Season Window</p>
        <p class="font-semibold">{{ seasonWindowLabel }}</p>
      </article>
      <article class="rounded-xl border border-soft bg-panel-soft p-3 text-sm">
        <p class="text-xs text-muted">Previous Season Rank</p>
        <p class="font-semibold">{{ previousRankLabel }}</p>
      </article>
    </div>

    <p v-if="error" class="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-muted">
            <th class="px-2 py-2">Rank</th>
            <th class="px-2 py-2">Player</th>
            <th class="px-2 py-2">Highest Card</th>
            <th class="px-2 py-2">Copies</th>
            <th class="px-2 py-2">Coins</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.rank}-${row.display_name}-${row.best_term_key || 'none'}`" class="border-t border-soft">
            <td class="px-2 py-2">{{ row.rank }}</td>
            <td class="px-2 py-2 font-medium">
              <div class="flex items-center gap-2">
                <vue-feather v-if="row.best_term_key" :type="cardIcon(row)" class="h-3.5 w-3.5 text-muted" stroke-width="2.3" aria-hidden="true"></vue-feather>
                <span>{{ row.display_name }}</span>
              </div>
              <span v-if="row.is_you" class="ml-2 rounded bg-panel-soft px-1.5 py-0.5 text-[11px] text-muted">You</span>
            </td>
            <td class="px-2 py-2">
              <div v-if="row.best_term_key" class="flex items-center gap-2">
                <vue-feather :type="cardIcon(row)" class="h-4 w-4" stroke-width="2.3" aria-hidden="true"></vue-feather>
                <div class="leading-tight">
                  <p class="font-medium">{{ cardName(row) }}</p>
                  <p class="text-xs text-muted">
                    T{{ row.best_term_tier }} · {{ row.best_term_rarity }} · {{ mutationLabel(row.best_term_mutation) }}
                  </p>
                </div>
              </div>
              <p v-else class="text-muted">No cards yet</p>
            </td>
            <td class="px-2 py-2">{{ formatNumber(row.best_term_copies) }}</td>
            <td class="px-2 py-2">{{ formatNumber(row.score) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!loading && rows.length === 0" class="mt-4 text-sm text-muted">No rankings yet.</p>
    <p v-else-if="viewerPlayerNumber" class="mt-4 text-sm text-muted">
      You are player number {{ viewerPlayerNumber }}<span v-if="totalPlayers"> of {{ totalPlayers }}</span>.
    </p>
    <p class="mt-2 text-sm text-muted">
      Highest card stolen by the duck:
      <span class="font-semibold text-main">{{ duckHighestCardLabel }}</span>
    </p>

    <section v-if="supportsSeasonHistory" class="mt-6 rounded-xl border border-soft bg-panel-soft p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-semibold">Season History</h2>
        <p class="text-xs text-muted">All completed seasons</p>
      </div>

      <p v-if="historyError" class="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ historyError }}</p>
      <p v-if="historyLoading" class="text-sm text-muted">Loading season history...</p>
      <p v-else-if="seasonHistory.length === 0" class="text-sm text-muted">No completed seasons yet.</p>
      <div v-else class="grid gap-3">
        <article
          v-for="row in seasonHistory"
          :key="`season-history-${row.season_id}`"
          class="rounded-xl border border-soft bg-white/80 p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold text-main">{{ formatSeasonLabel(row.season_id) }}</p>
          </div>

          <div class="mt-2 grid gap-2 md:grid-cols-3">
            <div class="podium-tile podium-tile--gold">
              <p class="text-[11px] uppercase tracking-wide text-amber-900">1st</p>
              <p class="mt-1 text-xs font-semibold text-amber-900">{{ podiumName(row, 1) }}</p>
              <p class="mt-1 text-[11px] text-amber-900">{{ podiumBestCardLabel(row, 1) }}</p>
            </div>
            <div class="podium-tile podium-tile--silver">
              <p class="text-[11px] uppercase tracking-wide text-slate-800">2nd</p>
              <p class="mt-1 text-xs font-semibold text-slate-800">{{ podiumName(row, 2) }}</p>
              <p class="mt-1 text-[11px] text-slate-700">{{ podiumBestCardLabel(row, 2) }}</p>
            </div>
            <div class="podium-tile podium-tile--bronze">
              <p class="text-[11px] uppercase tracking-wide text-orange-900">3rd</p>
              <p class="mt-1 text-xs font-semibold text-orange-900">{{ podiumName(row, 3) }}</p>
              <p class="mt-1 text-[11px] text-orange-900">{{ podiumBestCardLabel(row, 3) }}</p>
            </div>
          </div>

          <div v-if="showCollectionistSection(row)" class="mt-2 grid gap-2 md:grid-cols-2">
            <div class="podium-tile podium-tile--gold">
              <p class="text-[11px] uppercase tracking-wide text-amber-900">First Full Holo · Base Pack</p>
              <p class="mt-1 text-xs font-semibold text-amber-900">{{ firstFullHoloLabel(row, 1) }}</p>
            </div>
            <div class="podium-tile podium-tile--gold">
              <p class="text-[11px] uppercase tracking-wide text-amber-900">First Full Holo · Booster Pack</p>
              <p class="mt-1 text-xs font-semibold text-amber-900">{{ firstFullHoloLabel(row, 2) }}</p>
            </div>
          </div>

          <div class="mt-2 rounded-lg border border-soft bg-panel-soft p-2 text-center">
            <p class="text-[11px] uppercase tracking-wide text-muted">Personal Ranking</p>
            <p class="mt-1 text-xs text-main">Rank: {{ seasonRankLabel(row) }}</p>
            <p class="mt-1 text-xs text-main">{{ personalBestCardLabel(row) }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="mt-6 rounded-xl border border-soft bg-panel-soft p-4">
      <h2 class="text-base font-semibold">Report Inappropriate Name</h2>
      <p class="mt-1 text-sm text-muted">
        Please contact me if there are any inappropriate names. Use this form and I will review it.
      </p>

      <form class="mt-3 grid gap-3" @submit.prevent="submitNameReportForm">
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">Reported Name</label>
          <input
            v-model="reportedNameInput"
            class="form-input mt-2"
            type="text"
            maxlength="64"
            placeholder="Exact leaderboard name"
            required
          />
        </div>
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">Details (Optional)</label>
          <textarea
            v-model="reportDetailsInput"
            class="form-input mt-2"
            style="min-height:96px;"
            maxlength="500"
            placeholder="Any context that helps moderation"
          ></textarea>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-primary" type="submit" :disabled="reportSubmitting">
            {{ reportSubmitting ? 'Submitting...' : 'Send Report' }}
          </button>
        </div>
      </form>

      <p v-if="reportSuccessMessage" class="mt-3 text-sm text-green-700">{{ reportSuccessMessage }}</p>
      <p v-if="reportErrorMessage" class="mt-3 text-sm text-red-700">{{ reportErrorMessage }}</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import { TERMS_BY_KEY } from '../data/terms'

const store = useStore()
const AUTO_REFRESH_SECONDS = 15
const refreshCountdown = ref(AUTO_REFRESH_SECONDS)
const nextAutoRefreshAtMs = ref(0)
const autoRefreshInFlight = ref(false)
let refreshTimer = null
const reportedNameInput = ref('')
const reportDetailsInput = ref('')
const reportSubmitting = ref(false)
const reportSuccessMessage = ref('')
const reportErrorMessage = ref('')
const completionBoardRows = ref([])

const rows = computed(() => store.state.leaderboard.rows)
const supportsSeasonHistory = computed(() => Boolean(store.state.game.capabilities?.supports_season_history))
const loading = computed(() => store.state.leaderboard.loading)
const error = computed(() => store.state.leaderboard.error)
const historyLoading = computed(() => store.state.leaderboard.historyLoading)
const historyError = computed(() => store.state.leaderboard.historyError)
const seasonHistory = computed(() => store.state.leaderboard.seasonHistory || [])
const seasonInfo = computed(() => store.state.leaderboard.seasonInfo || null)
const viewerPreviousRank = computed(() => store.state.leaderboard.viewerPreviousRank || null)
const duckHighestStolen = computed(() => store.state.game.duckTheftStats?.highest || null)
const duckHighestCardLabel = computed(() => {
  if (!duckHighestStolen.value) return 'None yet'
  const entry = duckHighestStolen.value
  const tier = Number(entry.tier || 0)
  const rarity = String(entry.rarity || 'common').toLowerCase()
  const effect = mutationLabel(entry.mutation)
  return `${entry.name} · T${tier || '?'} · ${rarity} · ${effect}`
})
const seasonWindowLabel = computed(() => {
  const startsAt = seasonInfo.value?.startsAt
  const endsAt = seasonInfo.value?.endsAt
  if (!startsAt || !endsAt) return 'Unknown'
  return `${formatShortDate(startsAt)} - ${formatShortDate(endsAt)}`
})
const previousRankLabel = computed(() => {
  if (!viewerPreviousRank.value) return 'Unranked'
  return toOrdinal(viewerPreviousRank.value)
})
const viewerPlayerNumber = computed(() => {
  const rowWithViewerMeta = rows.value.find((row) => row?.viewer_player_number != null)
  if (rowWithViewerMeta) return Number(rowWithViewerMeta.viewer_player_number)

  const youRow = rows.value.find((row) => row?.is_you)
  if (youRow) return Number(youRow.player_number || 0)

  return null
})
const totalPlayers = computed(() => {
  if (!rows.value.length) return null
  return Number(rows.value[0]?.total_players || 0) || null
})

onMounted(async () => {
  await store.dispatch('game/hydrateDuckTheftStats')
  await refreshLeaderboard(true)
  if (supportsSeasonHistory.value) {
    await store.dispatch('leaderboard/fetchSeasonHistory', { limit: 200 })
  }
  if (store.state.game.capabilities?.supports_lifetime_collection) {
    try {
      const rows = await store.dispatch('game/fetchLifetimeCompletionBoard', { limit: 100 })
      completionBoardRows.value = Array.isArray(rows) ? rows : []
    } catch (_) {
      completionBoardRows.value = []
    }
  }
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})

function startAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }

  scheduleNextAutoRefresh(Date.now())
  updateAutoRefreshCountdown()

  refreshTimer = window.setInterval(() => {
    updateAutoRefreshCountdown()
  }, 250)

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
}

async function refreshLeaderboard(force = true) {
  await store.dispatch('leaderboard/fetch', { force, limit: 50 })
}

function scheduleNextAutoRefresh(fromMs = Date.now()) {
  nextAutoRefreshAtMs.value = fromMs + (AUTO_REFRESH_SECONDS * 1000)
}

function updateAutoRefreshCountdown() {
  const remainingMs = nextAutoRefreshAtMs.value - Date.now()
  refreshCountdown.value = Math.max(0, Math.ceil(remainingMs / 1000))

  if (remainingMs > 0 || autoRefreshInFlight.value) {
    return
  }

  autoRefreshInFlight.value = true
  void refreshLeaderboard(true)
    .catch(() => {
      // Fetch errors are already surfaced through store state.
    })
    .finally(() => {
      autoRefreshInFlight.value = false
      scheduleNextAutoRefresh(Date.now())
      refreshCountdown.value = AUTO_REFRESH_SECONDS
    })
}

function onVisibilityChange() {
  if (typeof document === 'undefined' || document.hidden) return
  updateAutoRefreshCountdown()
}

async function submitNameReportForm() {
  reportSuccessMessage.value = ''
  reportErrorMessage.value = ''

  const reportedName = String(reportedNameInput.value || '').trim()
  const details = String(reportDetailsInput.value || '').trim()

  if (!reportedName) {
    reportErrorMessage.value = 'Please provide the reported name.'
    return
  }

  reportSubmitting.value = true
  try {
    await store.dispatch('leaderboard/submitNameReport', { reportedName, details })
    reportSuccessMessage.value = 'Report submitted. Thank you.'
    reportDetailsInput.value = ''
  } catch (error) {
    reportErrorMessage.value = error?.message || 'Unable to submit report.'
  } finally {
    reportSubmitting.value = false
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatShortDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function cardIcon(row) {
  return TERMS_BY_KEY[row?.best_term_key]?.icon || 'help-circle'
}

function cardName(row) {
  return row?.best_term_name || TERMS_BY_KEY[row?.best_term_key]?.name || row?.best_term_key || 'Unknown Card'
}

function mutationLabel(mutation) {
  const key = String(mutation || '').trim().toLowerCase()
  if (key === 'holo' || key === 'prismatic' || key === 'glitched') return 'HOLO'
  if (key === 'foil') return 'FOIL'
  return 'None'
}

function podiumName(row, place) {
  if (place === 1) return String(row?.first_place_name || '').trim() || '-'
  if (place === 2) return String(row?.second_place_name || '').trim() || '-'
  return String(row?.third_place_name || '').trim() || '-'
}

function podiumBestCardLabel(row, place) {
  const prefix = place === 1
    ? 'first_place'
    : place === 2
      ? 'second_place'
      : 'third_place'
  const name = String(row?.[`${prefix}_best_term_name`] || '').trim()
  const tier = Number(row?.[`${prefix}_best_term_tier`] || 0)
  const rarity = String(row?.[`${prefix}_best_term_rarity`] || '').trim()
  const mutation = row?.[`${prefix}_best_term_mutation`]

  if (!name) return 'No card'
  return `${name} · T${tier || '?'} · ${rarity || 'common'} · ${mutationLabel(mutation)}`
}

function seasonRankLabel(row) {
  const rank = row?.rank == null ? null : Number(row.rank)
  const totalPlayers = Math.max(0, Number(row?.total_players || 0))
  if (rank == null || !Number.isFinite(rank) || rank <= 0) {
    return totalPlayers > 0 ? `Unranked/${totalPlayers}` : 'Unranked'
  }
  return totalPlayers > 0 ? `${rank}/${totalPlayers}` : `${rank}`
}

function personalBestCardLabel(row) {
  if (!row?.best_term_key) return 'Best card: None'
  return `Best card: ${row.best_term_name || row.best_term_key} · T${row.best_term_tier} · ${row.best_term_rarity} · ${mutationLabel(row.best_term_mutation)}`
}

function isExcludedBackfilledSeason(seasonRow) {
  const seasonId = String(seasonRow?.season_id || '').trim().toLowerCase()
  // Some clients/timezones can render the same UTC season boundary as Feb 16 even
  // when the stored key is the next UTC date. Exclude both keys.
  if (seasonId === 'week-2026-02-16' || seasonId === 'week-2026-02-17') return true

  const startsAtMs = Date.parse(String(seasonRow?.starts_at || ''))
  if (!Number.isFinite(startsAtMs)) return false
  const startsAtIsoDate = new Date(startsAtMs).toISOString().slice(0, 10)
  return startsAtIsoDate === '2026-02-16' || startsAtIsoDate === '2026-02-17'
}

function firstFullHoloEntry(seasonRow, layerNumber) {
  if (isExcludedBackfilledSeason(seasonRow)) return null

  const layer = Math.max(1, Math.min(2, Number(layerNumber || 1)))
  const startMs = Date.parse(String(seasonRow?.starts_at || ''))
  const endMs = Date.parse(String(seasonRow?.ends_at || ''))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null

  return (completionBoardRows.value || [])
    .filter((entry) => Number(entry?.layer || 1) === layer)
    .map((entry) => ({
      ...entry,
      completedMs: Date.parse(String(entry?.all_holo_completed_at || '')),
    }))
    .filter((entry) => Number.isFinite(entry.completedMs) && entry.completedMs >= startMs && entry.completedMs < endMs)
    .sort((a, b) => {
      if (a.completedMs !== b.completedMs) return a.completedMs - b.completedMs
      return String(a.display_name || '').localeCompare(String(b.display_name || ''))
    })[0]
}

function showCollectionistSection(seasonRow) {
  if (isExcludedBackfilledSeason(seasonRow)) return false
  return Boolean(firstFullHoloEntry(seasonRow, 1) || firstFullHoloEntry(seasonRow, 2))
}

function firstFullHoloLabel(seasonRow, layerNumber) {
  const first = firstFullHoloEntry(seasonRow, layerNumber)
  if (!first) return 'No full holo completion this season'
  return `${first.display_name || 'Unknown'} (${formatDateTime(first.all_holo_completed_at)})`
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

function formatSeasonLabel(value) {
  const raw = String(value || '').trim()
  const match = /^week-(\d{4})-(\d{2})-(\d{2})$/i.exec(raw)
  if (!match) return raw || 'Unknown Season'

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return raw

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function toOrdinal(value) {
  const n = Math.max(0, Number(value || 0))
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const mod10 = n % 10
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}
</script>

<style scoped>
.podium-tile {
  border-radius: 0.5rem;
  border: 1px solid transparent;
  padding: 0.5rem;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.podium-tile--gold {
  border-color: #f2c14e;
  background: linear-gradient(145deg, #ffe7a3 0%, #ffd86b 52%, #fff4d1 100%);
}

.podium-tile--silver {
  border-color: #b7bdc9;
  background: linear-gradient(145deg, #edf0f5 0%, #d7dce5 52%, #f7f8fb 100%);
}

.podium-tile--bronze {
  border-color: #d08a54;
  background: linear-gradient(145deg, #f7c59e 0%, #e7a06c 52%, #fde2cc 100%);
}
</style>
