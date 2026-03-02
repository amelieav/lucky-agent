import { createRouter, createWebHashHistory } from 'vue-router'
import store from '../store'
import SignIn from '../views/SignIn.vue'
import AuthCallback from '../views/AuthCallback.vue'
import Game from '../views/Game.vue'
import MoneyFlip from '../views/MoneyFlip.vue'
import Leaderboard from '../views/Leaderboard.vue'
import LifetimeCollection from '../views/LifetimeCollection.vue'
import DuckCave from '../views/DuckCave.vue'
import Profile from '../views/Profile.vue'
import NotFound from '../views/NotFound.vue'
import { hasAuthParamsInUrl } from '../lib/auth'

const routes = [
  {
    path: '/',
    name: 'SignIn',
    component: SignIn,
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallback,
  },
  {
    path: '/money-flip',
    name: 'MoneyFlip',
    component: MoneyFlip,
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/confirm',
    name: 'AuthConfirm',
    component: AuthCallback,
  },
  {
    path: '/login',
    redirect: '/',
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: Leaderboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/lifetime',
    name: 'LifetimeCollection',
    component: LifetimeCollection,
    meta: { requiresAuth: true },
  },
  {
    path: '/duck-cave',
    name: 'DuckCave',
    component: DuckCave,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

function requiresProfileNameSetup() {
  const profile = store.state.game.snapshot?.profile
  if (!profile) return false
  const displayName = String(profile.display_name || '').trim()
  return !displayName
}

router.beforeEach(async (to) => {
  if (!store.state.auth.initialized) {
    await store.dispatch('debug/hydrate')
    await store.dispatch('auth/initAuth')
  }

  const isAuthenticated = !!store.state.auth.user

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'SignIn' }
  }

  if (
    to.name === 'LifetimeCollection'
    && isAuthenticated
    && !store.state.game.capabilities?.supports_lifetime_collection
  ) {
    return { name: 'Game' }
  }

  if (
    to.name === 'DuckCave'
    && isAuthenticated
    && store.state.game.snapshot
    && (
      Math.max(0, Number(store.state.game.snapshot?.state?.rebirth_count || 0)) < 1
      && Math.max(1, Number(store.state.game.snapshot?.state?.active_layer || 1)) <= 1
    )
  ) {
    return { name: 'Game' }
  }

  if (
    isAuthenticated
    && requiresProfileNameSetup()
    && to.name !== 'Profile'
    && to.name !== 'AuthCallback'
    && to.name !== 'AuthConfirm'
  ) {
    return { name: 'Profile' }
  }

  if (to.name === 'NotFound' && hasAuthParamsInUrl()) {
    return { name: 'AuthCallback' }
  }

  if (to.name === 'NotFound' && isAuthenticated) {
    return requiresProfileNameSetup() ? { name: 'Profile' } : { name: 'Game' }
  }

  if (to.name === 'SignIn' && isAuthenticated) {
    return requiresProfileNameSetup() ? { name: 'Profile' } : { name: 'Game' }
  }

  return true
})

export default router
