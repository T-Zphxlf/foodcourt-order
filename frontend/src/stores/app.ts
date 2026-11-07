import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getShop } from '@/api'

export const useAppStore = defineStore('app', () => {
  const shop = ref<any>(null)
  const loading = ref(false)
  const tableNumber = ref<string>('')

  async function initShop(shopData?: any) {
    if (shop.value && shopData && shop.value.id === shopData.id) return
    shop.value = shopData
    loading.value = true
    try {
      const res: any = await getShop()
      shop.value = res.data || shopData
    } catch {
      // use provided data
    } finally {
      loading.value = false
    }
  }

  function setTable(num: string) {
    tableNumber.value = num
  }

  return {
    shop,
    loading,
    tableNumber,
    initShop,
    setTable,
  }
})