<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAdminOrder } from '@/api'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const orderId = computed(() => route.params.id as string)

const order = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res: any = await getAdminOrder(orderId.value)
    order.value = res.data
  } catch {
    //
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="text-gray-500 hover:text-gray-700">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-bold">{{ order?.order_no || t('common.loading') }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
    </div>

    <template v-else-if="order">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="font-semibold mb-4">{{ t('order.title') }}</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">{{ t('order.orderNo') }}</span><span>{{ order.order_no }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">{{ t('order.type') }}</span><span>{{ order.order_type === 'dine_in' ? t('order.dineIn') : order.order_type === 'takeout' ? t('order.takeout') : t('order.delivery') }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">{{ t('order.orderStatus') }}</span><span class="font-medium">{{ t(`order.status.${order.status}`) }}</span></div>
            <div v-if="order.table_number" class="flex justify-between"><span class="text-gray-500">{{ t('order.tableNumber') }}</span><span>{{ order.table_number }}</span></div>
            <div v-if="order.diners_count" class="flex justify-between"><span class="text-gray-500">{{ t('order.dinersCount') }}</span><span>{{ order.diners_count }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">{{ t('order.createdAt') }}</span><span>{{ order.created_at }}</span></div>
            <div v-if="order.user_remark" class="flex justify-between"><span class="text-gray-500">{{ t('order.remark') }}</span><span>{{ order.user_remark }}</span></div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="font-semibold mb-4">{{ t('order.amount') }}</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">{{ t('order.subtotal') }}</span><span>{{ t('common.currency') }}{{ order.subtotal_amount?.toFixed(2) }}</span></div>
            <div v-if="order.service_fee_amount" class="flex justify-between"><span class="text-gray-500">{{ t('order.serviceFee') }}</span><span>{{ t('common.currency') }}{{ order.service_fee_amount?.toFixed(2) }}</span></div>
            <div v-if="order.tax_amount" class="flex justify-between"><span class="text-gray-500">{{ t('order.tax') }}</span><span>{{ t('common.currency') }}{{ order.tax_amount?.toFixed(2) }}</span></div>
            <div v-if="order.discount_amount" class="flex justify-between text-green-600"><span>{{ t('order.discount') }}</span><span>-{{ t('common.currency') }}{{ order.discount_amount?.toFixed(2) }}</span></div>
            <div class="flex justify-between font-bold text-lg border-t pt-3"><span>{{ t('common.total') }}</span><span class="text-primary-600">{{ t('common.currency') }}{{ order.total_amount?.toFixed(2) }}</span></div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm mt-6">
        <div class="px-6 py-4 border-b"><h2 class="font-semibold">{{ t('order.items') }}</h2></div>
        <table class="w-full text-sm">
          <thead><tr class="text-left text-gray-500 border-b"><th class="px-6 py-3">{{ t('order.dish') }}</th><th class="px-6 py-3">{{ t('order.qty') }}</th><th class="px-6 py-3">{{ t('order.unitPrice') }}</th><th class="px-6 py-3">{{ t('order.subtotal') }}</th></tr></thead>
          <tbody>
            <tr v-for="item in (order.items || [])" :key="item.id" class="border-b last:border-0">
              <td class="px-6 py-3">{{ item.dish_name || item.dish_snapshot?.name }}</td>
              <td class="px-6 py-3">{{ item.quantity }}</td>
              <td class="px-6 py-3">{{ t('common.currency') }}{{ item.unit_price?.toFixed(2) }}</td>
              <td class="px-6 py-3 font-medium">{{ t('common.currency') }}{{ item.subtotal_amount?.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>