// Client กลางสำหรับเรียก backend API (FastAPI) — ทุกฟังก์ชัน fetch ของทั้งเว็บรวมไว้ที่นี่ที่เดียว
// เพื่อให้จุดต่อ backend เห็นชัดเจนในที่เดียว (ตรงตามข้อกำหนด "เชื่อม Database/API ให้ครบ")

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const ADMIN_TOKEN_KEY = 'nailglow_admin_token'
const CUSTOMER_PHONE_KEY = 'nailglow_customer_phone'

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}
export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
  else localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function getSavedPhone() {
  return localStorage.getItem(CUSTOMER_PHONE_KEY) || ''
}
export function savePhone(phone) {
  if (phone) localStorage.setItem(CUSTOMER_PHONE_KEY, phone)
}

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = false, params } = {}) {
  let url = `${API_BASE_URL}${path}`
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    if (qs) url += `?${qs}`
  }

  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAdminToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })

  if (!res.ok) {
    let detail = `เกิดข้อผิดพลาด (${res.status})`
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return null
  return res.json()
}

// --- Meta / catalog ---------------------------------------------------
export const getServiceCategories = () => request('/service-categories')
export const getServices = (categoryId) => request('/services', { params: { category_id: categoryId } })
export const getNailDesigns = (styleTag) => request('/nail-designs', { params: { style_tag: styleTag } })
export const getShopSettings = () => request('/shop-settings')
export const getAvailability = (date, durationMinutes) =>
  request('/availability', { params: { date, duration_minutes: durationMinutes } })

// --- Bookings -----------------------------------------------------------
export const createBooking = (payload) => request('/bookings', { method: 'POST', body: payload })
export const getBookingStatus = (bookingCode, phone) =>
  request('/bookings/status', { params: { booking_code: bookingCode, phone } })
export const getCustomerHistory = (phone) => request('/bookings/history', { params: { phone } })
export const cancelBooking = (bookingId, phone) =>
  request(`/bookings/${bookingId}/cancel`, { method: 'PATCH', params: { phone } })

// --- Reviews --------------------------------------------------------------
export const getReviews = (limit = 20) => request('/reviews', { params: { limit } })
export const createReview = (payload) => request('/reviews', { method: 'POST', body: payload })

// --- AI ---------------------------------------------------------------
export const aiSegment = (imageBase64) => request('/ai/segment', { method: 'POST', body: { image_base64: imageBase64 } })
export const aiTryOn = (payload) => request('/ai/tryon', { method: 'POST', body: payload })
export const aiAnalyzeStyle = (imageBase64) =>
  request('/ai/analyze-style', { method: 'POST', body: { image_base64: imageBase64 } })
export const aiRecommend = (payload) => request('/ai/recommend', { method: 'POST', body: payload })
export const aiRecommendAccept = (logId) => request(`/ai/recommend/${logId}/accept`, { method: 'POST' })

// --- Admin auth -------------------------------------------------------
export const adminLogin = (username, password) =>
  request('/admin/login', { method: 'POST', body: { username, password } })
export const adminMe = () => request('/admin/me', { auth: true })
export const adminChangePassword = (currentPassword, newPassword) =>
  request('/admin/password', {
    method: 'PUT',
    auth: true,
    body: { current_password: currentPassword, new_password: newPassword },
  })

// --- Admin bookings -----------------------------------------------------
export const adminListBookings = (params) => request('/admin/bookings', { auth: true, params })
export const adminUpdateBooking = (id, payload) =>
  request(`/admin/bookings/${id}`, { method: 'PATCH', auth: true, body: payload })

// --- Admin customers ------------------------------------------------------
export const adminSearchCustomers = (q) => request('/admin/customers', { auth: true, params: { q } })
export const adminCustomerDetail = (id) => request(`/admin/customers/${id}`, { auth: true })

// --- Admin catalog ------------------------------------------------------
export const adminListServices = () => request('/admin/services', { auth: true })
export const adminCreateService = (payload) => request('/admin/services', { method: 'POST', auth: true, body: payload })
export const adminUpdateService = (id, payload) =>
  request(`/admin/services/${id}`, { method: 'PUT', auth: true, body: payload })
export const adminDeleteService = (id) => request(`/admin/services/${id}`, { method: 'DELETE', auth: true })

export const adminListDesigns = () => request('/admin/nail-designs', { auth: true })
export const adminCreateDesign = (payload) => request('/admin/nail-designs', { method: 'POST', auth: true, body: payload })
export const adminUpdateDesign = (id, payload) =>
  request(`/admin/nail-designs/${id}`, { method: 'PUT', auth: true, body: payload })
export const adminDeleteDesign = (id) => request(`/admin/nail-designs/${id}`, { method: 'DELETE', auth: true })

export const adminUpdateShopSettings = (payload) =>
  request('/admin/shop-settings', { method: 'PUT', auth: true, body: payload })
export const adminListHolidays = () => request('/admin/holidays', { auth: true })
export const adminAddHoliday = (payload) => request('/admin/holidays', { method: 'POST', auth: true, body: payload })
export const adminDeleteHoliday = (id) => request(`/admin/holidays/${id}`, { method: 'DELETE', auth: true })

// --- Admin dashboard ------------------------------------------------------
export const adminDashboardSummary = () => request('/admin/dashboard/summary', { auth: true })
export const adminListExpenses = (params) => request('/admin/expenses', { auth: true, params })
export const adminCreateExpense = (payload) => request('/admin/expenses', { method: 'POST', auth: true, body: payload })
export const adminDeleteExpense = (id) => request(`/admin/expenses/${id}`, { method: 'DELETE', auth: true })

// --- helpers ------------------------------------------------------------
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export { ApiError, API_BASE_URL }
