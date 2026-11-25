// Data loader hook
import { useState, useEffect } from 'react'
import { loadAllData, type AllData } from './data'

export function useData() {
  const [data, setData] = useState<AllData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  return { data, error, loading }
}
