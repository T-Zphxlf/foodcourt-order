import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '') + '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fc-admin-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fc-admin-token')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(err.response?.data?.message || err.message))
  }
)

// Auth
export const adminLogin = (data: { email: string; password: string }) =>
  api.post('/admin/auth/login', { ...data, role: 'admin' })

// Shop
export const getShop = () => api.get('/admin/shop')
export const updateShop = (data: any) => api.put('/admin/shop', data)

// Dishes
export const getAdminDishes = (params?: any) => api.get('/admin/dishes', { params })
export const getAdminDish = (id: string) => api.get(`/admin/dishes/${id}`)
export const createDish = (data: any) => api.post('/admin/dishes', data)
export const updateDish = (id: string, data: any) => api.put(`/admin/dishes/${id}`, data)
export const deleteDish = (id: string) => api.delete(`/admin/dishes/${id}`)

// Orders
export const getAdminOrders = (params?: any) => api.get('/admin/orders', { params })
export const getAdminOrder = (id: string) => api.get(`/admin/orders/${id}`)
export const confirmOrder = (id: string) => api.post(`/admin/orders/${id}/confirm`)
export const prepareOrder = (id: string) => api.post(`/admin/orders/${id}/prepare`)
export const readyOrder = (id: string) => api.post(`/admin/orders/${id}/ready`)
export const completeOrder = (id: string) => api.post(`/admin/orders/${id}/complete`)
export const cancelAdminOrder = (id: string, data?: any) => api.post(`/admin/orders/${id}/cancel`, data)

// Stats
export const getAdminStats = () => api.get('/admin/stats/overview')
export const getAdminOrderStats = (params?: any) => api.get('/admin/stats/orders', { params })

export default api
