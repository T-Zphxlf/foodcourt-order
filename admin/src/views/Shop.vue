<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getShop } from '@/api'

const { t, locale } = useI18n()

const shop = ref<any>(null)
const loading = ref(true)

async function loadShop() {
  try {
    const res: any = await getShop()
    shop.value = res.data
  } catch {
    //
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadShop()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ t('nav.shop') }}</h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
    </div>

    <template v-else-if="shop">
      <div class="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <h2 class="font-semibold mb-4">{{ t('shop.shopInfo') }}</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.name') }}</span>
            <span class="font-medium">{{ shop.name }}</span>
          </div>
          <div v-if="shop.address" class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.address') }}</span>
            <span>{{ shop.address }}</span>
          </div>
          <div v-if="shop.phone" class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.phone') }}</span>
            <span>{{ shop.phone }}</span>
          </div>
          <div v-if="shop.opening_hours" class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.openingHours') }}</span>
            <span>{{ shop.opening_hours }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.currency') }}</span>
            <span>{{ shop.currency }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.taxRate') }}</span>
            <span>{{ shop.tax_rate }}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.serviceFeeRate') }}</span>
            <span>{{ shop.service_fee_rate }}%</span>
          </div>
          <div v-if="shop.min_order_amount" class="flex justify-between">
            <span class="text-gray-500">{{ t('shop.minOrderAmount') }}</span>
            <span>{{ shop.currency }}{{ shop.min_order_amount }}</span>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <a
          :href="`/settings`"
          class="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
        >
          {{ t('settings.editConfig') }}
        </a>
      </div>
    </template>
  </div>
</template>
