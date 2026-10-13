import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const api = axios.create({ baseURL: API_URL })

export const tokens = {
  get access() { return localStorage.getItem('access_token') },
  get refresh() { return localStorage.getItem('refresh_token') },
  set(a: string, r: string) { localStorage.setItem('access_token', a); localStorage.setItem('refresh_token', r) },
  clear() { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token') },
}

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!tokens.refresh) return null
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: tokens.refresh })
    tokens.set(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register')
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall && tokens.access) {
      original._retry = true
      refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null })
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      tokens.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

/** Human readable message from a FastAPI error response */
export function errorMessage(err: unknown): string {
  const e = err as AxiosError<any>
  const detail = e.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail?.message) return detail.message
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ')
  return e.message || 'Something went wrong'
}

export async function downloadFile(path: string, fallbackName: string) {
  const res = await api.get(path, { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] as string | undefined
  const name = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
