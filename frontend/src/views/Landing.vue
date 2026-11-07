<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const shopName = '我的面馆'
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
      <div class="bg-primary-500 text-white px-6 py-4 rounded-xl mb-6 inline-block">
        <h1 class="text-2xl font-bold">{{ shopName }}</h1>
      </div>
      <p class="text-gray-500 mb-6">{{ t('home.welcome') }}</p>
      <button
        class="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
        @click="router.push('/')"
      >
        {{ t('home.startOrdering') }}
      </button>
    </div>
  </div>
</template>
