import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Layout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue') },
        { path: 'dish/:dishId', name: 'dish-detail', component: () => import('@/views/DishDetail.vue') },
        { path: 'cart', name: 'cart', component: () => import('@/views/Cart.vue') },
        { path: 'checkout', name: 'checkout', component: () => import('@/views/Checkout.vue') },
        { path: 'orders', name: 'orders', component: () => import('@/views/Orders.vue') },
        { path: 'order/:orderId', name: 'order-detail', component: () => import('@/views/OrderDetail.vue') },
        { path: 'search', name: 'search', component: () => import('@/views/Search.vue') },
      ],
    },
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/Landing.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
