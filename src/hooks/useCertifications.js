import { useState, useEffect, useCallback } from 'react'

export function useCertifications() {
  const [certs, setCerts] = useState([])

  const fetchCerts = useCallback(async () => {
    const res = await fetch('/api/certifications')
    if (res.ok) setCerts(await res.json())
  }, [])

  useEffect(() => { fetchCerts() }, [fetchCerts])

  const addCert = useCallback(async (data) => {
    const res = await fetch('/api/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const cert = await res.json()
      setCerts(prev => [cert, ...prev])
      return cert
    }
    return null
  }, [])

  const deleteCert = useCallback(async (id) => {
    await fetch(`/api/certifications/${id}`, { method: 'DELETE' })
    setCerts(prev => prev.filter(c => c.id !== id))
  }, [])

  return { certs, addCert, deleteCert }
}
