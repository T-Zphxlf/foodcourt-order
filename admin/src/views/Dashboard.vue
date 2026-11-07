<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminStats } from '@/api'

const { t } = useI18n()
const stats = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res: any = await getAdminStats()
    stats.value = res.data
  } catch {
    //
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ t('nav.dashboard') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
    </div>

    <div v-else-if="stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Orders -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="text-sm text-gray-500">{{ t('dashboard.totalOrders') }}</div>
        <div class="text-3xl font-bold text-primary-600 mt-1">{{ stats.total_orders || 0 }}</div>
      </div>

      <!-- Total Revenue -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="text-sm text-gray-500">{{ t('dashboard.totalRevenue') }}</div>
        <div class="text-3xl font-bold text-green-600 mt-1">
          {{ t('common.currency') }}{{ (stats.total_revenue || 0).toFixed(2) }}
        </div>
      </div>

      <!-- Pending Orders -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="text-sm text-gray-500">{{ t('dashboard.pendingOrders') }}</div>
        <div class="text-3xl font-bold text-yellow-600 mt-1">{{ stats.pending_orders || 0 }}</div>
      </div>

      <!-- Paid Orders -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="text-sm text-gray-500">{{ t('dashboard.paidOrders') }}</div>
        <div class="text-3xl font-bold text-blue-600 mt-1">{{ stats.paid_orders || 0 }}</div>
      </div>
    </div>
  </div>
</template>
