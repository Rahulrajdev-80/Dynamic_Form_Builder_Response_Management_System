import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'

/** Tiny GET helper: returns data, loading, error and a reload function. */
export function useLoad<T>(path: string | null, params?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dep = JSON.stringify([path, params])

  const load = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== '' && v !== undefined && v !== null))
      setData((await api.get<T>(path, { params: clean })).data)
      setError('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}
