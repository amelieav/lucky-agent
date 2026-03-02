<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <article class="card p-5 lg:col-span-2">
      <h1 class="text-xl font-semibold">Profile</h1>
      <p class="mt-1 text-sm text-muted">Set your leaderboard display name.</p>

      <div class="mt-4 rounded-xl border border-soft bg-panel-soft p-4">
        <p class="text-xs uppercase tracking-wide text-muted">Email</p>
        <p class="mt-1 text-sm font-medium break-all">{{ authEmail || 'Not signed in' }}</p>
      </div>

      <div class="mt-4 rounded-xl border border-soft bg-panel-soft p-4">
        <p class="text-xs uppercase tracking-wide text-muted">Leaderboard Name</p>
        <p class="mt-1 text-lg font-semibold">{{ currentName }}</p>
      </div>

      <form class="mt-4 grid gap-3" @submit.prevent="saveName">
        <div class="rounded-xl border border-soft bg-panel-soft p-3">
          <label for="display-name-input" class="text-xs uppercase tracking-wide text-muted">Change Leaderboard Name</label>
          <input
            id="display-name-input"
            v-model="draftName"
            class="form-input mt-2"
            type="text"
            autocomplete="off"
            maxlength="10"
            placeholder="Agent_007"
            @input="onNameInput"
          />
          <p class="mt-2 text-xs text-muted">3-10 chars · letters, numbers, underscore only.</p>
          <p v-if="validationMessage" class="mt-2 text-sm text-red-700">{{ validationMessage }}</p>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary" type="button" @click="suggestName">Random Suggestion</button>
          <button class="btn-primary" type="submit" :disabled="loading || !canSave">Save</button>
        </div>
      </form>

      <p v-if="saveMessage" class="mt-3 text-sm text-green-700">{{ saveMessage }}</p>
      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>

      <div class="mt-4 rounded-xl border border-soft bg-panel-soft p-4">
        <p class="text-xs uppercase tracking-wide text-muted">Performance</p>
        <p class="mt-1 text-sm text-muted">Disable visual animations for smoother gameplay on low-spec devices.</p>
        <button
          class="anim-switch mt-3"
          :class="{ 'anim-switch--off': animationsDisabled }"
          type="button"
          role="switch"
          :aria-checked="(!animationsDisabled).toString()"
          @click="toggleAnimations"
        >
          <span class="anim-switch__thumb"></span>
          <span class="anim-switch__label">
            {{ animationsDisabled ? 'Performance Mode ON' : 'Performance Mode OFF' }}
          </span>
        </button>
      </div>

      <div class="mt-5 border-t border-soft pt-4">
        <router-link class="btn-go-game w-full text-center" to="/game">
          Take me to the game
        </router-link>
      </div>
    </article>

    <article class="card p-5">
      <h2 class="text-lg font-semibold">Rules</h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
        <li>3-10 characters.</li>
        <li>Only letters, numbers, and underscore.</li>
        <li>No profanity.</li>
        <li>No references to religion.</li>
        <li>No references to countries.</li>
        <li>No derogatory language.</li>
      </ul>

      <div class="mt-5 border-t border-soft pt-4">
        <button class="btn-danger w-full" type="button" @click="handleSignOut">Sign out</button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { NICK_PARTS_A, NICK_PARTS_B } from '../data/nicknameParts'
import { validateDisplayName } from '../lib/displayNameValidation.mjs'
import { loadAnimationsDisabled, setAnimationsDisabled } from '../lib/animationPrefs'

const store = useStore()
const router = useRouter()
const saveMessage = ref('')
const draftName = ref('')
const edited = ref(false)
const animationsDisabled = ref(false)

const snapshot = computed(() => store.state.game.snapshot)
const profile = computed(() => snapshot.value?.profile || {})
const loading = computed(() => store.state.game.actionLoading)
const error = computed(() => store.state.game.error)
const authEmail = computed(() => store.state.auth.user?.email || '')

const currentName = computed(() => profile.value.display_name || '')
const nameCustomized = computed(() => Boolean(profile.value.name_customized))
const validation = computed(() => validateDisplayName(draftName.value))
const validationMessage = computed(() => (validation.value.ok ? '' : validation.value.message))
const canSave = computed(() => {
  if (!validation.value.ok) return false
  if (!nameCustomized.value) return true
  return validation.value.value !== String(currentName.value || '')
})

watch(
  () => profile.value.display_name,
  (nextName) => {
    if (!edited.value) {
      draftName.value = String(nextName || '')
    }
  },
  { immediate: true },
)

onMounted(async () => {
  animationsDisabled.value = loadAnimationsDisabled()
  if (!snapshot.value) {
    await store.dispatch('game/bootstrapPlayer')
  }
  if (!draftName.value && currentName.value) {
    draftName.value = currentName.value
  }
})

function onNameInput() {
  edited.value = true
  saveMessage.value = ''
}

function suggestName() {
  saveMessage.value = ''
  edited.value = true

  for (let i = 0; i < 20; i += 1) {
    const candidate = `${pick(NICK_PARTS_A)}_${pick(NICK_PARTS_B)}`
    const check = validateDisplayName(candidate)
    if (check.ok) {
      draftName.value = check.value
      return
    }
  }

  draftName.value = `Player_${Math.floor(Math.random() * 9000) + 1000}`
}

async function saveName() {
  saveMessage.value = ''

  const check = validateDisplayName(draftName.value)
  if (!check.ok) {
    return
  }

  await store.dispatch('game/updateNickname', {
    displayName: check.value,
  })

  if (!store.state.game.error) {
    saveMessage.value = 'Display name updated.'
    edited.value = false
  }
}

async function handleSignOut() {
  await store.dispatch('auth/signOut')
  router.push('/')
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function toggleAnimations() {
  animationsDisabled.value = !animationsDisabled.value
  setAnimationsDisabled(animationsDisabled.value)
}
</script>

<style scoped>
.btn-danger {
  border-radius: 0.7rem;
  border: 1px solid #c83a3a;
  background: #db4747;
  color: #fff;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-danger:hover {
  background: #c83939;
}

.btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-go-game {
  display: inline-block;
  border-radius: 0.8rem;
  border: 1px solid #2f9c52;
  background: linear-gradient(145deg, #58c776 0%, #3caf61 58%, #2e9951 100%);
  color: #ffffff;
  padding: 0.7rem 1rem;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-decoration: none;
  box-shadow: 0 10px 18px rgba(46, 153, 81, 0.24);
}

.btn-go-game:hover {
  background: linear-gradient(145deg, #67d183 0%, #44b467 58%, #319e56 100%);
}

.anim-switch {
  position: relative;
  width: 15.2rem;
  height: 4.25rem;
  border-radius: 999px;
  border: 1px solid #2f9c52;
  background: linear-gradient(145deg, #58c776 0%, #3caf61 58%, #2e9951 100%);
  color: #ffffff;
  font-size: 1.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 3.4rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.anim-switch--off {
  border-color: #b63d3d;
  background: linear-gradient(145deg, #da6262 0%, #cb4e4e 58%, #b84040 100%);
}

.anim-switch__thumb {
  position: absolute;
  left: calc(100% - 1.8rem - 0.24rem);
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: left 0.2s ease;
}

.anim-switch--off .anim-switch__thumb {
  left: 0.24rem;
}

.anim-switch__label {
  position: relative;
  z-index: 1;
  user-select: none;
  white-space: nowrap;
  font-size: 0.64rem;
  letter-spacing: 0.03em;
}
</style>
