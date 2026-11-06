<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { getShop, updateShop } from '@/api'

const { t, locale } = useI18n()

const shop = ref<any>(null)
const saving = ref(false)
const saveSuccess = ref(false)

const form = ref({
  name: '',
  address: '',
  phone: '',
  opening_hours: '',
  currency: 'CNY',
  tax_rate: 0,
  service_fee_rate: 0,
  min_order_amount: 0,
  qr_code_base_url: '',
})

async function loadShop() {
  try {
    const res: any = await getShop()
    shop.value = res.data
    if (shop.value) {
      form.value = {
        name: shop.value.name || '',
        address: shop.value.address || '',
        phone: shop.value.phone || '',
        opening_hours: shop.value.opening_hours || '',
        currency: shop.value.currency || 'CNY',
        tax_rate: shop.value.tax_rate || 0,
        service_fee_rate: shop.value.service_fee_rate || 0,
        min_order_amount: shop.value.min_order_amount || 0,
        qr_code_base_url: shop.value.qr_code_base_url || '',
      }
    }
  } catch {
    //
  }
}

async function handleSave() {
  saving.value = true
  saveSuccess.value = false
  try {
    await updateShop(form.value)
    saveSuccess.value = true
    await loadShop()
  } catch {
    //
  } finally {
    saving.value = false
  }
}

function changeLang(lang: string) {
  setLocale(lang)
}

onMounted(() => {
  loadShop()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ t('nav.settings') }}</h1>

    <!-- Shop Configuration -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6 max-w-3xl">
      <h2 class="font-semibold mb-4">{{ t('settings.shopConfig') }}</h2>

      <form @submit.prevent="handleSave" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.name') }}</label>
          <input v-model="form.name" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.address') }}</label>
          <input v-model="form.address" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.phone') }}</label>
          <input v-model="form.phone" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.openingHours') }}</label>
          <input v-model="form.opening_hours" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="09:00-22:00" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.currency') }}</label>
          <select v-model="form.currency" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="CNY">CNY (¥)</option>
            <option value="USD">USD ($)</option>
            <option value="MYR">MYR (RM)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.taxRate') }}</label>
          <input v-model.number="form.tax_rate" type="number" step="0.01" min="0" max="1" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0.06" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.serviceFeeRate') }}</label>
          <input v-model.number="form.service_fee_rate" type="number" step="0.01" min="0" max="1" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0.1" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.minOrderAmount') }}</label>
          <input v-model.number="form.min_order_amount" type="number" step="0.01" min="0" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('shop.qrCodeBaseUrl') }}</label>
          <input v-model="form.qr_code_base_url" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://your-domain.com/t/" />
        </div>

        <div class="md:col-span-2 flex justify-end gap-3 pt-4">
          <button type="button" class="px-4 py-2 text-sm text-gray-600" @click="loadShop">{{ t('common.cancel') }}</button>
          <button type="submit" :disabled="saving" class="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">
            {{ saving ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </form>

      <div v-if="saveSuccess" class="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
        {{ t('settings.saveSuccess') }}
      </div>
    </div>

    <!-- Language -->
    <div class="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      <h2 class="font-semibold mb-3">{{ t('settings.language') }}</h2>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 rounded-lg text-sm transition-colors"
          :class="locale === 'en' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="changeLang('en')"
        >
          English
        </button>
        <button
          class="px-4 py-2 rounded-lg text-sm transition-colors"
          :class="locale === 'zh-CN' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="changeLang('zh-CN')"
        >
          中文
        </button>
      </div>
    </div>
  </div>
</template>