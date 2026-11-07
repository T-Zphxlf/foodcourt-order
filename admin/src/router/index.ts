import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/views/AdminLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
        { path: 'shop', name: 'shop', component: () => import('@/views/Shop.vue') },
        { path: 'dishes', name: 'dishes', component: () => import('@/views/Dishes.vue') },
        { path: 'orders', name: 'orders', component: () => import('@/views/Orders.vue') },
        { path: 'orders/:id', name: 'order-detail', component: () => import('@/views/OrderDetail.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/Settings.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('fc-admin-token')
  if (!to.meta?.public && !token) {
    return { name: 'login' }
  }
})

export default router
