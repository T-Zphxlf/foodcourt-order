<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminDishes, createDish, updateDish, deleteDish } from '@/api'

const { t } = useI18n()

const dishes = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingDish = ref<any>(null)
const form = ref({
  category_id: '',
  name: '',
  name_en: '',
  description: '',
  description_en: '',
  price: 0,
  original_price: null,
  cost_price: null,
  image_url: '',
  unit: '份',
  portion_size: '',
  soup_bases: '[]',
  styles: '[]',
  addons: '[]',
  has_inventory: 0,
  remaining_stock: null,
  low_stock_threshold: 5,
  max_per_order: 0,
  is_spicy: 0,
  spicy_level: null,
  is_vegetarian: 0,
  is_vegan: 0,
  allergens: '',
  tags: '',
  is_recommended: 0,
  is_available: 1,
  status: 'active',
})

const categories = ref<any[]>([])
const statusOptions = ['active', 'inactive', 'draft']

async function loadDishes() {
  loading.value = true
  try {
    const res: any = await getAdminDishes()
    dishes.value = res.data || []
  } catch {
    //
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res: any = await getAdminDishes({ limit: 100 })
    // We don't have a separate categories API, use dishes' categories
    const cats = new Map()
    for (const d of res.data || []) {
      if (d.category_name && !cats.has(d.category_name)) {
        cats.set(d.category_name, { id: d.category_name, name: d.category_name })
      }
    }
    categories.value = Array.from(cats.values())
  } catch {
    //
  }
}

function openModal(dish: any | null) {
  if (dish) {
    editingDish.value = dish
    form.value = { ...dish }
  } else {
    editingDish.value = null
    resetForm()
  }
  showModal.value = true
}

function resetForm() {
  form.value = {
    category_id: '',
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    price: 0,
    original_price: null,
    cost_price: null,
    image_url: '',
    unit: '份',
    portion_size: '',
    soup_bases: '[]',
    styles: '[]',
    addons: '[]',
    has_inventory: 0,
    remaining_stock: null,
    low_stock_threshold: 5,
    max_per_order: 0,
    is_spicy: 0,
    spicy_level: null,
    is_vegetarian: 0,
    is_vegan: 0,
    allergens: '',
    tags: '',
    is_recommended: 0,
    is_available: 1,
    status: 'active',
  }
}

async function handleSubmit() {
  try {
    if (editingDish.value) {
      await updateDish(editingDish.value.id, form.value)
    } else {
      await createDish(form.value)
    }
    showModal.value = false
    loadDishes()
  } catch {
    //
  }
}

async function handleDelete(id: string) {
  if (!confirm(t('common.confirmDelete') + '?')) return
  try {
    await deleteDish(id)
    loadDishes()
  } catch {
    //
  }
}

function formatPrice(price: number) {
  return price.toFixed(2)
}

onMounted(() => {
  loadDishes()
  loadCategories()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ t('nav.dishes') }}</h1>
      <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="openModal(null)">
        {{ t('dishes.addNew') }}
      </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500 border-b bg-gray-50">
            <th class="px-5 py-3 font-medium">{{ t('dishes.name') }}</th>
            <th class="px-5 py-3 font-medium">{{ t('dishes.category') }}</th>
            <th class="px-5 py-3 font-medium">{{ t('dishes.price') }}</th>
            <th class="px-5 py-3 font-medium">{{ t('dishes.status') }}</th>
            <th class="px-5 py-3 font-medium">{{ t('dishes.recommended') }}</th>
            <th class="px-5 py-3 font-medium">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dish in dishes" :key="dish.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="px-5 py-3 font-medium">{{ dish.name }}</td>
            <td class="px-5 py-3 text-gray-500">{{ dish.category_name || '-' }}</td>
            <td class="px-5 py-3">{{ t('common.currency') }}{{ formatPrice(dish.price) }}</td>
            <td class="px-5 py-3">
              <span class="px-2 py-1 rounded-full text-xs"
                :class="dish.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
                {{ t(`dish.status.${dish.status}`) }}
              </span>
            </td>
            <td class="px-5 py-3">
              <span v-if="dish.is_recommended" class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                {{ t('dishes.recommended') }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-5 py-3">
              <div class="flex gap-1">
                <button class="px-2 py-1 text-primary-600 text-xs hover:underline" @click="openModal(dish)">
                  {{ t('common.edit') }}
                </button>
                <button class="px-2 py-1 text-red-600 text-xs hover:underline" @click="handleDelete(dish.id)">
                  {{ t('common.delete') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!dishes.length">
            <td colspan="6" class="px-5 py-8 text-center text-gray-400">{{ t('common.noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 class="text-lg font-semibold">{{ editingDish ? t('dishes.edit') : t('dishes.addNew') }}</h2>
          <button @click="showModal = false" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.category') }}</label>
              <select v-model="form.category_id" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">{{ t('dishes.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.name') }}</label>
              <input v-model="form.name" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.nameEn') }}</label>
              <input v-model="form.name_en" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.price') }}</label>
              <input v-model.number="form.price" type="number" step="0.01" min="0" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.description') }}</label>
              <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.descriptionEn') }}</label>
              <textarea v-model="form.description_en" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.unit') }}</label>
              <input v-model="form.unit" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('dishes.imageUrl') }}</label>
              <input v-model="form.image_url" class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div class="flex items-center gap-4 pt-2">
              <label class="flex items-center gap-2">
                <input type="checkbox" v-model="form.is_recommended" class="rounded" />
                <span class="text-sm">{{ t('dishes.recommended') }}</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" v-model="form.is_available" class="rounded" />
                <span class="text-sm">{{ t('dishes.available') }}</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" v-model="form.is_spicy" class="rounded" />
                <span class="text-sm">{{ t('dishes.spicy') }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button type="button" class="px-4 py-2 text-sm text-gray-600" @click="showModal = false">{{ t('common.cancel') }}</button>
            <button type="submit" class="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm">{{ t('common.save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
