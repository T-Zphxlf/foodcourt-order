import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api'

export interface CartItem {
  id: string
  dish_id: string
  dish_name: string
  dish_name_en?: string
  dish_image?: string
  quantity: number
  unit_price: number
  subtotal: number
  customizations: any[]
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const loading = ref(false)

  const totalItems = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const totalAmount = computed(() => items.value.reduce((sum, i) => sum + i.subtotal, 0))

  async function fetchCart() {
    loading.value = true
    try {
      const res: any = await api.getCart()
      items.value = res.data?.items || []
    } catch {
      // Cart may be empty
    } finally {
      loading.value = false
    }
  }

  async function addItem(dish: any, quantity = 1, customizations: any[] = []) {
    try {
      await api.addToCart({ dish_id: dish.id, quantity, customizations })
      await fetchCart()
    } catch (e: any) {
      throw e
    }
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      return removeItem(itemId)
    }
    try {
      await api.updateCartItem(itemId, { quantity })
      await fetchCart()
    } catch (e: any) {
      throw e
    }
  }

  async function removeItem(itemId: string) {
    try {
      await api.removeCartItem(itemId)
      await fetchCart()
    } catch (e: any) {
      throw e
    }
  }

  async function clear() {
    try {
      await api.clearCart()
      items.value = []
    } catch (e: any) {
      throw e
    }
  }

  return {
    items,
    loading,
    totalItems,
    totalAmount,
    fetchCart,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  }
})