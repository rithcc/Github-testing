// API helper for making authenticated requests

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headers: HeadersInit = {
      ...options.headers,
    }

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return { data: null, error: data.error || 'Request failed' }
    }

    return { data, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// Auth helpers
export function getUser() {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function isAuthenticated() {
  return !!getToken()
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

// API endpoints
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),

  getMe: () => apiRequest('/api/auth/me'),

  // Bills
  getBills: (params?: { month?: string; type?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.month) searchParams.set('month', params.month)
    if (params?.type) searchParams.set('type', params.type)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return apiRequest(`/api/bills?${searchParams}`)
  },

  createBill: (data: {
    type: string
    amount?: number
    units: number
    date: string
    notes?: string
    entryMethod?: 'scanner' | 'manual'
  }) =>
    apiRequest('/api/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadBill: (formData: FormData) =>
    apiRequest('/api/bills/upload', {
      method: 'POST',
      body: formData,
    }),

  deleteBill: (id: string) =>
    apiRequest(`/api/bills/${id}`, { method: 'DELETE' }),

  // Carbon Score
  getCarbonScores: (params?: { month?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.month) searchParams.set('month', params.month)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return apiRequest(`/api/carbon/score?${searchParams}`)
  },

  // Carbon Budget
  getCarbonBudget: (month?: string) => {
    const searchParams = month ? `?month=${month}` : ''
    return apiRequest(`/api/carbon/budget${searchParams}`)
  },

  setCarbonBudget: (data: {
    month: string
    targetEmission: number
    electricityBudget?: number
    transportBudget?: number
    gasBudget?: number
  }) =>
    apiRequest('/api/carbon/budget', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Challenges
  getChallenges: (includeProgress?: boolean) => {
    const searchParams = includeProgress ? '?progress=true' : ''
    return apiRequest(`/api/challenges${searchParams}`)
  },

  getMyChallenges: (status?: string) => {
    const searchParams = status ? `?status=${status}` : ''
    return apiRequest(`/api/challenges/my${searchParams}`)
  },

  joinChallenge: (challengeId: string) =>
    apiRequest('/api/challenges', {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    }),

  updateChallengeProgress: (
    challengeId: string,
    data: { progress?: number; carbonSaved?: number; status?: string }
  ) =>
    apiRequest(`/api/challenges/${challengeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  leaveChallenge: (challengeId: string) =>
    apiRequest(`/api/challenges/${challengeId}`, { method: 'DELETE' }),

  // Recommendations
  getRecommendations: (params?: { category?: string; impact?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.impact) searchParams.set('impact', params.impact)
    return apiRequest(`/api/recommendations?${searchParams}`)
  },
}
