import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/journal',
    name: 'journal',
    component: () => import('../views/JournalView.vue')
  },
  {
    path: '/journal/:slug',
    name: 'post',
    component: () => import('../views/PostView.vue')
  },
  {
    path: '/work',
    name: 'work-index',
    component: () => import('../views/WorkIndexView.vue')
  },
  {
    path: '/work/:slug',
    name: 'work',
    component: () => import('../views/WorkView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // Scroll is managed by Lenis in App.vue
    return false
  }
})

export default router
