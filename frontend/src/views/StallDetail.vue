<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getDishes } from '@/api'
import DishCard from '@/components/DishCard.vue'

const router = useRouter()
const { t } = useI18n()

const dishes = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res: any = await getDishes()
    dishes.value = res.data?.dishes || []
  } catch {
    //
  } finally {
    loading.value = false
  }
})

function goToDish(dish: any) {
  router.push(`/dish/${dish.id}`)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="bg-white px-4 py-3 sticky top-0 z-10 border-b">
      <h1 class="text-lg font-bold">{{ t('home.allDishes') }}</h1>
    </div>

    <div class="px-4 pt-4">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
      </div>
      <div v-else class="space-y-3 pb-4">
        <DishCard
          v-for="dish in dishes"
          :key="dish.id"
          :dish="dish"
          @click="goToDish"
        />
        <div v-if="!dishes.length" class="text-center py-8 text-gray-400">
          {{ t('common.noData') }}
        </div>
      </div>
    </div>
  </div>
</template>
