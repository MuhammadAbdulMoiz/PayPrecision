import { useState, useEffect, useCallback } from 'react'

export function useAssets() {
  const [assets, setAssets] = useState([])

  const fetchAssets = useCallback(async () => {
    const res = await fetch('/api/assets')
    if (res.ok) setAssets(await res.json())
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const addAsset = useCallback(async (data) => {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const asset = await res.json()
      setAssets(prev => [asset, ...prev])
      return asset
    }
    return null
  }, [])

  const updateAsset = useCallback(async (id, data) => {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setAssets(prev => prev.map(a => a.id === id ? updated : a))
    }
  }, [])

  const deleteAsset = useCallback(async (id) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const uploadAssetImage = useCallback(async (id, file) => {
    const reader = new FileReader()
    return new Promise((resolve) => {
      reader.onload = async (e) => {
        const res = await fetch(`/api/images/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: e.target.result }),
        })
        if (res.ok) {
          await updateAsset(id, { hasImage: true })
          resolve(true)
        } else resolve(false)
      }
      reader.readAsDataURL(file)
    })
  }, [updateAsset])

  return { assets, addAsset, updateAsset, deleteAsset, uploadAssetImage, refetch: fetchAssets }
}
