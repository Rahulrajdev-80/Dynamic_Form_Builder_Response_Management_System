import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api, tokens } from '../api/client'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (full_name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthState>(null as unknown as AuthState)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokens.access) { setLoading(false); return }
    api.get<User>('/auth/me').then((r) => setUser(r.data)).catch(() => tokens.clear()).finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    tokens.set(data.access_token, data.refresh_token)
    setUser((await api.get<User>('/auth/me')).data)
  }
  const register = async (full_name: string, email: string, password: string) => {
    await api.post('/auth/register', { full_name, email, password })
    await login(email, password)
  }
  const logout = () => { tokens.clear(); setUser(null) }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
