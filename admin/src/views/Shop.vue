<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getShop, updateShop } from '@/api'

const router = useRouter()
const { t } = useI18n()

const shop = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const message = ref('')

const form = ref({
  name: '',
  address: '',
  phone: '',
  opening_time: '',
  closing_time: '',
  currency: 'CNY',
  tax_rate: 0.06,
  service_fee_rate: 0.10,
  min_order_amount: 0,
  qr_domain: '',
})

onMounted(async () => {
  await loadShop()
})

async function loadShop() {
  loading.value = true
  try {
    const res = await getShop()
    shop.value = res.data
    if (shop.value) {
      Object.keys(form.value).forEach(key => {
        if (shop.value[key] !== undefined) {
          form.value[key] = shop.value[key]
        }
      })
    }
  } catch (e: any) {
    message.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function saveShop() {
  saving.value = true
  message.value = ''
  try {
    await updateShop(form.value)
    message.value = '保存成功'
    await loadShop()
  } catch (e: any) {
    message.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ t('shop.title') }}</h1>
      <p class="text-gray-500 mt-1">{{ t('shopConfigDesc') || '配置店铺基本信息、营业时间、价格规则等' }}</p>
    </div>

    <div v-if="message" :class="['mb-4 p-3 rounded', message.includes('失败') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600']">
      {{ message }}
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
    </div>

    <form v-else @submit.prevent="saveShop" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.name') }}</label>
          <input v-model="form.name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.address') }}</label>
          <input v-model="form.address" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.phone') }}</label>
          <input v-model="form.phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.openingTime') }}</label>
          <input v-model="form.opening_time" type="time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.closingTime') }}</label>
          <input v-model="form.closing_time" type="time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.currency') }}</label>
          <select v-model="form.currency" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="CNY">CNY (人民币)</option>
            <option value="USD">USD (美元)</option>
            <option value="MYR">MYR (马币)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.taxRate') }}</label>
          <input v-model.number="form.tax_rate" type="number" step="0.01" min="0" max="1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.serviceFeeRate') }}</label>
          <input v-model.number="form.service_fee_rate" type="number" step="0.01" min="0" max="1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.minOrderAmount') }}</label>
          <input v-model.number="form.min_order_amount" type="number" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.qrDomain') }}</label>
          <input v-model="form.qr_domain" type="text" placeholder="https://your-domain.com" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <p class="text-sm text-gray-500 mt-1">{{ t('shop.qrDomainDesc') }}</p>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" @click="loadShop" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{{ t('common.reset') }}</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{{ saving ? t('common.saving') : t('common.save') }}</button>
      </div>
    </form>
  </div>
</template>