<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const cartStore = useCartStore()

const tabs = computed(() => [
  { name: 'home', icon: 'home', label: t('nav.home'), path: '/' },
  { name: 'stalls', icon: 'store', label: t('nav.menu'), path: '/stalls' },
  { name: 'cart', icon: 'cart', label: t('nav.cart'), path: '/cart', badge: cartStore.totalItems },
  { name: 'orders', icon: 'receipt', label: t('nav.orders'), path: '/orders' },
])

const activeTab = computed(() => {
  const name = route.name as string
  if (name === 'stall-detail' || name === 'stalls') return 'stalls'
  if (name === 'cart' || name === 'checkout') return 'cart'
  if (name === 'orders' || name === 'order-detail') return 'orders'
  return 'home'
})

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 safe-bottom z-30">
    <div class="flex justify-around items-center">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="flex flex-col items-center gap-1 text-xs"
        :class="activeTab === tab.name ? 'text-primary-500' : 'text-gray-500'"
        @click="goTo(tab.path)"
      >
        <span :class="`icon-${tab.icon}`">{{ tab.label }}</span>
        <span v-if="tab.badge" class="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
          {{ tab.badge }}
        </span>
      </button>
    </div>
  </div>
</template>
