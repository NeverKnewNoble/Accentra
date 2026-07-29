import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/landing/LandingPage.vue'),
    meta: { title: 'Accentra — Accounting that keeps perfect time' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/login.vue'),
    meta: { title: 'Sign in · Accentra', guestOnly: true },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../pages/auth/signup.vue'),
    meta: { title: 'Create your account · Accentra', guestOnly: true },
  },
  {
    // Every portal page renders inside this layout, so the sidebar and topbar
    // mount once and survive navigation between children.
    path: '/portal',
    component: () => import('../components/portal/PortalLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../pages/portal/dashboard.vue'),
        meta: { title: 'Overview · Accentra' },
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: () => import('../pages/portal/invoices.vue'),
        meta: { title: 'Invoices · Accentra' },
      },
      {
        path: 'expenses',
        name: 'expenses',
        component: () => import('../pages/portal/expenses.vue'),
        meta: { title: 'Expenses · Accentra' },
      },
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('../pages/portal/transactions.vue'),
        meta: { title: 'Transactions · Accentra' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('../pages/portal/reports.vue'),
        meta: { title: 'Reports · Accentra' },
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: () => import('../pages/portal/payroll.vue'),
        meta: { title: 'Payroll · Accentra' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../pages/portal/settings.vue'),
        meta: { title: 'Settings · Accentra' },
      },
    ],
  },
  // Keeps the old flat URL working for anyone who has it bookmarked.
  { path: '/dashboard', redirect: { name: 'dashboard' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// Resolves once the initial session has been read out of storage, so a reload
// inside /portal doesn't bounce an already-signed-in user back to /login.
function whenAuthReady(loading) {
  if (!loading.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(loading, (value) => {
      if (!value) {
        stop()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to) => {
  // `requiresAuth` sits on the /portal parent, so check the whole matched
  // chain rather than only the leaf route's own meta.
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  // Public routes skip this entirely, so the landing page never pulls in the
  // Supabase client — it stays loadable even before .env.local is filled in.
  if (!requiresAuth && !to.meta.guestOnly) return true

  const { useAuth } = await import('../composables/useAuth')
  const { session, loading } = useAuth()
  await whenAuthReady(loading)

  if (requiresAuth && !session.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && session.value) {
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title
})

export default router
