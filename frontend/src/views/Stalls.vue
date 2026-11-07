<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getMenuCategories } from '@/api'

const { t } = useI18n()

const categories = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res: any = await getMenuCategories()
    categories.value = res.data || []
  } catch {
    //
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="bg-white px-4 py-3 sticky top-0 z-10 border-b">
      <h1 class="text-lg font-bold">{{ t('home.allCategories') }}</h1>
    </div>

    <div class="px-4 pt-4">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
      </div>
      <div v-else class="grid grid-cols-2 gap-3 pb-4">
        <div
          v-for="category in categories"
          :key="category.id"
          class="bg-white p-4 rounded-xl border border-gray-100"
        >
          <h3 class="font-bold text-lg mb-2">{{ category.name }}</h3>
          <p v-if="category.description" class="text-sm text-gray-500 mb-3">{{ category.description }}</p>
          <button
            class="w-full py-2 bg-primary-100 text-primary-600 rounded-lg text-sm font-medium"
            :class="`bg-primary-50 text-primary-600`"
          >
            {{ t('home.viewCategory') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
